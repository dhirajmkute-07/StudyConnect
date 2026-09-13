require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');

const app = express();

/* =========================================================
   CONFIG
========================================================= */

const PORT = process.env.PORT || 3000;

const SECRET =
    process.env.JWT_SECRET ||
    'studyconnect-change-this-secret-in-production';

const RESEND_API_KEY =
    process.env.RESEND_API_KEY ||
    process.env.Resend_API_KEY;

const EMAIL_FROM =
    process.env.EMAIL_FROM ||
    'StudyConnect <onboarding@resend.dev>';

const resend = RESEND_API_KEY
    ? new Resend(RESEND_API_KEY)
    : null;

const DB = path.join(__dirname, '..', 'data', 'db.json');

/* =========================================================
   APP MIDDLEWARE
========================================================= */

app.use(cors());

app.use(
    express.json({
        limit: '8mb'
    })
);

app.use(
    express.static(
        path.join(__dirname, '..', 'public')
    )
);

/* =========================================================
   DATABASE HELPERS
========================================================= */

function readDB() {
    try {
        if (!fs.existsSync(DB)) {
            return { users: [] };
        }

        return JSON.parse(
            fs.readFileSync(DB, 'utf8')
        );
    } catch (error) {
        console.error('[StudyConnect] DB read error:', error);
        return { users: [] };
    }
}

function writeDB(db) {
    try {
        const dir = path.dirname(DB);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {
                recursive: true
            });
        }

        fs.writeFileSync(
            DB,
            JSON.stringify(db, null, 2),
            'utf8'
        );
    } catch (error) {
        console.error('[StudyConnect] DB write error:', error);
        throw error;
    }
}

/* =========================================================
   GENERAL HELPERS
========================================================= */

function id() {
    return crypto.randomUUID();
}

function sign(user) {
    return jwt.sign(
        {
            sub: user.id,
            email: user.email
        },
        SECRET,
        {
            expiresIn: '7d'
        }
    );
}

function normalizeEmail(email) {
    return String(email || '')
        .trim()
        .toLowerCase();
}

function generateOTP() {
    return crypto
        .randomInt(100000, 1000000)
        .toString();
}

function hashOTP(otp) {
    return crypto
        .createHash('sha256')
        .update(String(otp))
        .digest('hex');
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* =========================================================
   AUTH MIDDLEWARE
========================================================= */

function auth(req, res, next) {
    const header =
        req.headers.authorization || '';

    if (!header.startsWith('Bearer ')) {
        return res.status(401).json({
            message: 'Please sign in.'
        });
    }

    const token = header.slice(7);

    try {
        req.user = jwt.verify(
            token,
            SECRET
        );

        next();
    } catch (error) {
        return res.status(401).json({
            message:
                'Session expired. Please sign in again.'
        });
    }
}

/* =========================================================
   USER HELPERS
========================================================= */

function current(db, req) {
    return db.users.find(
        user => user.id === req.user.sub
    );
}

/*
  Never send password or OTP/security fields
  to the browser.
*/

function safe(user) {
    if (!user) return null;

    const {
        passwordHash,
        verifyToken,
        resetToken,

        verifyOtpHash,
        verifyOtpExpiresAt,
        verifyOtpAttempts,
        verifyOtpLastSentAt,

        resetOtpHash,
        resetOtpExpiresAt,
        resetOtpAttempts,
        resetOtpLastSentAt,

        ...rest
    } = user;

    return rest;
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

function notify(
    user,
    title,
    message,
    type = 'info'
) {
    if (!Array.isArray(user.notifications)) {
        user.notifications = [];
    }

    user.notifications.unshift({
        id: id(),
        title,
        message,
        type,
        createdAt: new Date().toISOString(),
        read: false
    });

    user.notifications =
        user.notifications.slice(0, 50);
}

/* =========================================================
   EMAIL
========================================================= */

async function sendOTPEmail(
    email,
    otp,
    purpose
) {
    if (!resend) {
        throw new Error(
            'RESEND_API_KEY is not configured.'
        );
    }

    const isVerify =
        purpose === 'verify';

    const subject = isVerify
        ? 'StudyConnect Email Verification OTP'
        : 'StudyConnect Password Reset OTP';

    const title = isVerify
        ? 'Verify your StudyConnect account'
        : 'Reset your StudyConnect password';

    const intro = isVerify
        ? 'Use the OTP below to verify your StudyConnect email address.'
        : 'Use the OTP below to reset your StudyConnect password.';

   console.log('[StudyConnect ] Sending OTP:',
    { 
        to: email, 
        form: EMAIL_FROM,
        purpose
});
   
        const result =
        await resend.emails.send({
            from: EMAIL_FROM,
            to: [email],
            subject,

            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport"
                        content="width=device-width,initial-scale=1.0">
                    <title>${subject}</title>
                </head>

                <body style="
                    margin:0;
                    padding:0;
                    background:#f5f7fb;
                    font-family:Arial,Helvetica,sans-serif;
                ">

                    <div style="
                        max-width:600px;
                        margin:40px auto;
                        background:#ffffff;
                        border-radius:16px;
                        padding:35px;
                        box-shadow:0 10px 30px rgba(0,0,0,.08);
                    ">

                        <h1 style="
                            margin-top:0;
                            color:#111827;
                        ">
                            StudyConnect
                        </h1>

                        <h2 style="
                            color:#1f2937;
                        ">
                            ${title}
                        </h2>

                        <p style="
                            color:#4b5563;
                            font-size:15px;
                            line-height:1.6;
                        ">
                            ${intro}
                        </p>

                        <div style="
                            margin:30px 0;
                            padding:20px;
                            background:#f3f4f6;
                            border-radius:12px;
                            text-align:center;
                        ">

                            <div style="
                                font-size:34px;
                                font-weight:700;
                                letter-spacing:10px;
                                color:#111827;
                            ">
                                ${otp}
                            </div>

                        </div>

                        <p style="
                            color:#4b5563;
                            font-size:14px;
                        ">
                            This OTP is valid for
                            <strong>10 minutes</strong>.
                        </p>

                        <p style="
                            color:#6b7280;
                            font-size:13px;
                            line-height:1.6;
                        ">
                            If you did not request this code,
                            you can safely ignore this email.
                        </p>

                        <hr style="
                            border:0;
                            border-top:1px solid #e5e7eb;
                            margin:30px 0;
                        ">

                        <p style="
                            color:#9ca3af;
                            font-size:12px;
                            margin:0;
                        ">
                            StudyConnect — Student Productivity Platform
                        </p>

                    </div>

                </body>
                </html>
            `
        });

    if (result.error) {
        throw new Error(
            result.error.message ||
            'Unable to send email.'
        );
    }

    return result;
}

/* =========================================================
   USER CREATION
========================================================= */

function seedUser(
    email,
    password,
    name
) {
    return {
        id: id(),

        email,

        passwordHash:
            bcrypt.hashSync(password, 10),

        // Email verification removed: new accounts are active immediately.
        emailVerified: true,

        /*
          Old token system kept only for
          backward compatibility.
        */
        verifyToken: null,
        resetToken: null,

        /* Verification OTP */
        verifyOtpHash: null,
        verifyOtpExpiresAt: null,
        verifyOtpAttempts: 0,
        verifyOtpLastSentAt: null,

        /* Password reset OTP */
        resetOtpHash: null,
        resetOtpExpiresAt: null,
        resetOtpAttempts: 0,
        resetOtpLastSentAt: null,

        profile: {
            fullName: name || '',
            college: '',
            university: '',
            branch: '',
            year: '',
            section: '',
            rollNo: '',
            phone: '',
            photo: '',
            bio: '',
            weakSubjects: [],
            strongSubjects: [],
            className: '',
            batch: ''
        },

        subjects: [],
        timetable: [],
        attendance: [],
        tasks: [],
        tests: [],
        notifications: []
    };
}

/* =========================================================
   SIGNUP
========================================================= */

app.post(
    '/api/auth/signup',
    async (req, res) => {
        try {
            const {
                email,
                password,
                fullName
            } = req.body;

            const normalizedEmail =
                normalizeEmail(email);

            if (
                !normalizedEmail ||
                !password
            ) {
                return res.status(400).json({
                    message:
                        'Email and password are required.'
                });
            }

            if (!isValidEmail(normalizedEmail)) {
                return res.status(400).json({
                    message:
                        'Please enter a valid email address.'
                });
            }

            if (password.length < 6) {
                return res.status(400).json({
                    message:
                        'Password must be at least 6 characters.'
                });
            }

            const db = readDB();

            const existingUser =
                db.users.find(
                    user =>
                        user.email ===
                        normalizedEmail
                );

            if (existingUser) {
                return res.status(409).json({
                    message:
                        'An account with this email already exists.'
                });
            }

            const trimmedName = String(fullName || '').trim();
            if (!trimmedName) {
                return res.status(400).json({
                    message: 'Please enter your full name.'
                });
            }

            const user = seedUser(
                normalizedEmail,
                password,
                trimmedName
            );

            db.users.push(user);

            notify(
                user,
                'Welcome to StudyConnect',
                `Hi ${trimmedName}, your account was created successfully.`,
                'success'
            );

            writeDB(db);

            return res.json({
                message: 'Account created successfully.',
                token: sign(user),
                user: safe(user)
            });

        } catch (error) {
            console.error(
                '[StudyConnect] Signup error:',
                error
            );

            return res.status(500).json({
                message:
                    'Account could not be created. Please try again.'
            });
        }
    }
);

/* =========================================================
   VERIFY EMAIL OTP
========================================================= */

app.post(
    '/api/auth/verify',
    (req, res) => {
        try {
            const {
                email,
                token,
                otp
            } = req.body;

            const normalizedEmail =
                normalizeEmail(email);

            /*
              Support both "token" and "otp"
              so old frontend won't immediately break.
            */

            const submittedOTP =
                String(
                    otp || token || ''
                ).trim();

            if (
                !normalizedEmail ||
                !submittedOTP
            ) {
                return res.status(400).json({
                    message:
                        'Email and OTP are required.'
                });
            }

            const db = readDB();

            const user =
                db.users.find(
                    u =>
                        u.email ===
                        normalizedEmail
                );

            if (!user) {
                return res.status(400).json({
                    message:
                        'Invalid verification request.'
                });
            }

            if (user.emailVerified) {
                return res.json({
                    message:
                        'Email is already verified.'
                });
            }

            if (
                !user.verifyOtpHash ||
                !user.verifyOtpExpiresAt
            ) {
                return res.status(400).json({
                    message:
                        'No active OTP found. Please request a new OTP.'
                });
            }

            if (
                Date.now() >
                user.verifyOtpExpiresAt
            ) {
                return res.status(400).json({
                    message:
                        'OTP has expired. Please request a new OTP.'
                });
            }

            if (
                user.verifyOtpAttempts >= 5
            ) {
                return res.status(429).json({
                    message:
                        'Too many incorrect attempts. Please request a new OTP.'
                });
            }

            const submittedHash =
                hashOTP(submittedOTP);

            if (
                submittedHash !==
                user.verifyOtpHash
            ) {
                user.verifyOtpAttempts += 1;

                writeDB(db);

                return res.status(400).json({
                    message:
                        'Invalid OTP.'
                });
            }

            /* SUCCESS */

            user.emailVerified = true;

            user.verifyOtpHash = null;
            user.verifyOtpExpiresAt = null;
            user.verifyOtpAttempts = 0;
            user.verifyOtpLastSentAt = null;

            user.verifyToken = null;

            notify(
                user,
                'Email Verified',
                'Your StudyConnect email has been verified successfully.',
                'success'
            );

            writeDB(db);

            return res.json({
                message:
                    'Email verified successfully.'
            });

        } catch (error) {
            console.error(
                '[StudyConnect] Verify error:',
                error
            );

            return res.status(500).json({
                message:
                    'Unable to verify OTP.'
            });
        }
    }
);

/* =========================================================
   RESEND VERIFICATION OTP
========================================================= */

app.post(
    '/api/auth/resend-verification',
    async (req, res) => {
        try {
            const normalizedEmail =
                normalizeEmail(
                    req.body.email
                );

            if (!normalizedEmail) {
                return res.status(400).json({
                    message:
                        'Email is required.'
                });
            }

            const db = readDB();

            const user =
                db.users.find(
                    u =>
                        u.email ===
                        normalizedEmail
                );

            /*
              Generic response helps avoid
              revealing account existence.
            */

            if (!user) {
                return res.json({
                    message:
                        'If this account exists, a new OTP has been sent.'
                });
            }

            if (user.emailVerified) {
                return res.json({
                    message:
                        'This email is already verified.'
                });
            }

            const now =
                Date.now();

            const lastSent =
                user.verifyOtpLastSentAt || 0;

            const cooldown =
                60 * 1000;

            if (
                now - lastSent <
                cooldown
            ) {
                const seconds =
                    Math.ceil(
                        (cooldown -
                            (now - lastSent)) /
                        1000
                    );

                return res.status(429).json({
                    message:
                        `Please wait ${seconds} seconds before requesting another OTP.`
                });
            }

            const otp =
                generateOTP();

            user.verifyOtpHash =
                hashOTP(otp);

            user.verifyOtpExpiresAt =
                now + 10 * 60 * 1000;

            user.verifyOtpAttempts = 0;

            user.verifyOtpLastSentAt =
                now;

            await sendOTPEmail(
                normalizedEmail,
                otp,
                'verify'
            );

            writeDB(db);

            return res.json({
                message:
                    'A new verification OTP has been sent to your email.'
            });

        } catch (error) {
            console.error(
                '[StudyConnect] Resend verification error:',
                error
            );

            return res.status(500).json({
                message:
                    'Unable to send verification OTP.'
            });
        }
    }
);

/* =========================================================
   LOGIN
========================================================= */

app.post(
    '/api/auth/login',
    (req, res) => {
        try {
            const {
                email,
                password
            } = req.body;

            const normalizedEmail =
                normalizeEmail(email);

            if (
                !normalizedEmail ||
                !password
            ) {
                return res.status(400).json({
                    message:
                        'Email and password are required.'
                });
            }

            const db = readDB();

            const user =
                db.users.find(
                    u =>
                        u.email ===
                        normalizedEmail
                );

            if (
                !user ||
                !bcrypt.compareSync(
                    password,
                    user.passwordHash
                )
            ) {
                return res.status(401).json({
                    message:
                        'Invalid email or password.'
                });
            }

            // Email verification removed: existing unverified users are auto-activated.
            if (!user.emailVerified) {
                user.emailVerified = true;
                user.verifyOtpHash = null;
                user.verifyOtpExpiresAt = null;
                user.verifyOtpAttempts = 0;
                user.verifyOtpLastSentAt = null;
                writeDB(db);
            }

            return res.json({
                token: sign(user),
                user: safe(user)
            });

        } catch (error) {
            console.error(
                '[StudyConnect] Login error:',
                error
            );

            return res.status(500).json({
                message:
                    'Unable to sign in.'
            });
        }
    }
);

/* =========================================================
   FORGOT PASSWORD
========================================================= */

app.post(
    '/api/auth/forgot',
    async (req, res) => {
        try {
            const normalizedEmail =
                normalizeEmail(
                    req.body.email
                );

            if (!normalizedEmail) {
                return res.status(400).json({
                    message:
                        'Email is required.'
                });
            }

            const db = readDB();

            const user =
                db.users.find(
                    u =>
                        u.email ===
                        normalizedEmail
                );

            /*
              Always return generic response
              to prevent email enumeration.
            */

            if (!user) {
                return res.json({
                    message:
                        'If the account exists, a password reset OTP has been sent to the email.'
                });
            }

            const now =
                Date.now();

            const lastSent =
                user.resetOtpLastSentAt || 0;

            const cooldown =
                60 * 1000;

            if (
                now - lastSent <
                cooldown
            ) {
                const seconds =
                    Math.ceil(
                        (cooldown -
                            (now - lastSent)) /
                        1000
                    );

                return res.status(429).json({
                    message:
                        `Please wait ${seconds} seconds before requesting another OTP.`
                });
            }

            const otp =
                generateOTP();

            user.resetOtpHash =
                hashOTP(otp);

            user.resetOtpExpiresAt =
                now + 10 * 60 * 1000;

            user.resetOtpAttempts = 0;

            user.resetOtpLastSentAt =
                now;

            user.resetToken = null;

            await sendOTPEmail(
                normalizedEmail,
                otp,
                'reset'
            );

            writeDB(db);

            return res.json({
                message:
                    'If the account exists, a password reset OTP has been sent to the email.'
            });

        } catch (error) {
            console.error(
                '[StudyConnect] Forgot password error:',
                error
            );

            return res.status(500).json({
                message:
                    'Unable to send password reset OTP.'
            });
        }
    }
);

/* =========================================================
   RESET PASSWORD WITH OTP
========================================================= */

app.post(
    '/api/auth/reset',
    (req, res) => {
        try {
            const {
                email,
                token,
                otp,
                password
            } = req.body;

            const normalizedEmail =
                normalizeEmail(email);

            const submittedOTP =
                String(
                    otp || token || ''
                ).trim();

            if (
                !normalizedEmail ||
                !submittedOTP ||
                !password
            ) {
                return res.status(400).json({
                    message:
                        'Email, OTP and new password are required.'
                });
            }

            if (password.length < 6) {
                return res.status(400).json({
                    message:
                        'Password must be at least 6 characters.'
                });
            }

            const db = readDB();

            const user =
                db.users.find(
                    u =>
                        u.email ===
                        normalizedEmail
                );

            if (!user) {
                return res.status(400).json({
                    message:
                        'Invalid password reset request.'
                });
            }

            if (
                !user.resetOtpHash ||
                !user.resetOtpExpiresAt
            ) {
                return res.status(400).json({
                    message:
                        'No active reset OTP found. Please request a new OTP.'
                });
            }

            if (
                Date.now() >
                user.resetOtpExpiresAt
            ) {
                return res.status(400).json({
                    message:
                        'Reset OTP has expired. Please request a new OTP.'
                });
            }

            if (
                user.resetOtpAttempts >= 5
            ) {
                return res.status(429).json({
                    message:
                        'Too many incorrect attempts. Please request a new OTP.'
                });
            }

            const submittedHash =
                hashOTP(submittedOTP);

            if (
                submittedHash !==
                user.resetOtpHash
            ) {
                user.resetOtpAttempts += 1;

                writeDB(db);

                return res.status(400).json({
                    message:
                        'Invalid reset OTP.'
                });
            }

            /* SUCCESS */

            user.passwordHash =
                bcrypt.hashSync(
                    password,
                    10
                );

            user.resetOtpHash = null;
            user.resetOtpExpiresAt = null;
            user.resetOtpAttempts = 0;
            user.resetOtpLastSentAt = null;

            user.resetToken = null;

            notify(
                user,
                'Password Changed',
                'Your StudyConnect password was changed successfully.',
                'success'
            );

            writeDB(db);

            return res.json({
                message:
                    'Password reset successfully. You can now sign in.'
            });

        } catch (error) {
            console.error(
                '[StudyConnect] Reset password error:',
                error
            );

            return res.status(500).json({
                message:
                    'Unable to reset password.'
            });
        }
    }
);

/* =========================================================
   CURRENT USER
========================================================= */

app.get(
    '/api/me',
    auth,
    (req, res) => {
        const db = readDB();

        const user =
            current(db, req);

        if (!user) {
            return res.status(404).json({
                message:
                    'User not found.'
            });
        }

        return res.json(
            safe(user)
        );
    }
);

/* =========================================================
   PROFILE
========================================================= */

app.put(
    '/api/profile',
    auth,
    (req, res) => {
        const db = readDB();

        const user =
            current(db, req);

        if (!user) {
            return res.status(404).json({
                message:
                    'User not found.'
            });
        }

        user.profile = {
            ...user.profile,
            ...req.body
        };

        writeDB(db);

        return res.json(
            user.profile
        );
    }
);

/* =========================================================
   COLLECTION ROUTES
========================================================= */

function collectionRoute(name) {

    /* GET ALL */

    app.get(
        `/api/${name}`,
        auth,
        (req, res) => {
            const db = readDB();

            const user =
                current(db, req);

            if (!user) {
                return res.status(404).json({
                    message:
                        'User not found.'
                });
            }

            return res.json(
                Array.isArray(user[name])
                    ? user[name]
                    : []
            );
        }
    );

    /* CREATE */

    app.post(
        `/api/${name}`,
        auth,
        (req, res) => {
            const db = readDB();

            const user =
                current(db, req);

            if (!user) {
                return res.status(404).json({
                    message:
                        'User not found.'
                });
            }

            if (!Array.isArray(user[name])) {
                user[name] = [];
            }

            const item = {
                id: id(),
                createdAt:
                    new Date().toISOString(),
                ...req.body
            };

            user[name].push(item);

            writeDB(db);

            return res.status(201).json(
                item
            );
        }
    );

    /* UPDATE */

    app.put(
        `/api/${name}/:id`,
        auth,
        (req, res) => {
            const db = readDB();

            const user =
                current(db, req);

            if (!user) {
                return res.status(404).json({
                    message:
                        'User not found.'
                });
            }

            const index =
                user[name].findIndex(
                    item =>
                        item.id ===
                        req.params.id
                );

            if (index < 0) {
                return res.status(404).json({
                    message:
                        'Item not found.'
                });
            }

            user[name][index] = {
                ...user[name][index],
                ...req.body,
                updatedAt:
                    new Date().toISOString()
            };

            writeDB(db);

            return res.json(
                user[name][index]
            );
        }
    );

    /* DELETE */

    app.delete(
        `/api/${name}/:id`,
        auth,
        (req, res) => {
            const db = readDB();

            const user =
                current(db, req);

            if (!user) {
                return res.status(404).json({
                    message:
                        'User not found.'
                });
            }

            const before =
                user[name].length;

            user[name] =
                user[name].filter(
                    item =>
                        item.id !==
                        req.params.id
                );

            if (
                before ===
                user[name].length
            ) {
                return res.status(404).json({
                    message:
                        'Item not found.'
                });
            }

            writeDB(db);

            return res.json({
                ok: true
            });
        }
    );
}

/* =========================================================
   STUDYCONNECT COLLECTIONS
========================================================= */

[
    'subjects',
    'timetable',
    'attendance',
    'tasks',
    'tests'
].forEach(
    collectionRoute
);

/* =========================================================
   NOTIFICATIONS
========================================================= */

app.get(
    '/api/notifications',
    auth,
    (req, res) => {
        const db = readDB();

        const user =
            current(db, req);

        if (!user) {
            return res.status(404).json({
                message:
                    'User not found.'
            });
        }

        return res.json(
            user.notifications || []
        );
    }
);

app.put(
    '/api/notifications/:id/read',
    auth,
    (req, res) => {
        const db = readDB();

        const user =
            current(db, req);

        if (!user) {
            return res.status(404).json({
                message:
                    'User not found.'
            });
        }

        const notification =
            (user.notifications || [])
                .find(
                    n =>
                        n.id ===
                        req.params.id
                );

        if (notification) {
            notification.read = true;
        }

        writeDB(db);

        return res.json({
            ok: true
        });
    }
);

app.post(
    '/api/notifications/read-all',
    auth,
    (req, res) => {
        const db = readDB();

        const user =
            current(db, req);

        if (!user) {
            return res.status(404).json({
                message:
                    'User not found.'
            });
        }

        (user.notifications || [])
            .forEach(
                n =>
                    n.read = true
            );

        writeDB(db);

        return res.json({
            ok: true
        });
    }
);

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get(
    '/api/health',
    (req, res) => {
        return res.json({
            ok: true,
            service: 'StudyConnect',
            emailConfigured:
                Boolean(RESEND_API_KEY),
            timestamp:
                new Date().toISOString()
        });
    }
);

/* =========================================================
   FRONTEND FALLBACK
========================================================= */

app.use(
    (req, res) => {
        res.sendFile(
            path.join(
                __dirname,
                '..',
                'public',
                'index.html'
            )
        );
    }
);

/* =========================================================
   SERVER START
========================================================= */

app.listen(
    PORT,
    () => {
        console.log(
            `StudyConnect running at http://localhost:${PORT}`
        );

        console.log(
            `[StudyConnect] Resend email: ${
                RESEND_API_KEY
                    ? 'CONFIGURED'
                    : 'NOT CONFIGURED'
            }`
        );

        if (
            SECRET ===
            'studyconnect-change-this-secret'
        ) {
            console.warn(
                '[StudyConnect] WARNING: Set a strong JWT_SECRET in .env before production.'
            );
        }
    }
);