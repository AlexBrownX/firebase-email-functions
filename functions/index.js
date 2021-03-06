'use strict';

// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database. 
const admin = require('firebase-admin');

// Node based Email client
const nodemailer = require('nodemailer');

const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: gmailEmail,
        pass: gmailPassword
    }
});

// Adds a CORS wrapper to all requests.
// TODO - Don't allow all origins
const cors = require('cors');
const sanitizer = require('sanitize')();

// Initialise the Admin SDK
admin.initializeApp();

const EMAIL_FROM = 'Jana Jurakova Makeup Artist';

exports.writeBooking = functions.https.onRequest((req, res) => {
    console.log('Called CORS Wrapper')
    var corsWrapper = cors();

    corsWrapper(req, res, function() {
        console.log('Calling writeBooking function with method: ' + req.method);

        _writeBooking(req, res);
    });
});

const _writeBooking = function(req, res) {
    
    
    if (!req.body.name) {
        const message = 'Name is required';
        console.log('Rejected booking: ' + message);
        res.status(400).send(message);
        return;
    }

    if (!req.body.email) {
        const message = 'Email address is required';
        console.log('Rejected booking: ' + message);
        res.status(400).send(message);
        return;
    }
    
    if (!req.body.message) {
        const message = 'Message is required';
        console.log('Rejected booking: ' + message);
        res.status(400).send(message);
        return;
    }

    const booking = {
        name: sanitizer.value(req.body.name, 'str'),
        email: sanitizer.value(req.body.email, 'email'),
        telephone: sanitizer.value(req.body.telephone, 'phone'),
        subject: sanitizer.value(req.body.subject, 'str'),
        message: sanitizer.value(req.body.message, 'str'),
        timestamp: admin.database.ServerValue.TIMESTAMP
    };

    console.log('Writing booking to database. ' + JSON.stringify(booking));

    admin.database().ref('/bookings').push({booking: booking}).then(snapshot => {
        console.log('wrote booking to database. ' + JSON.stringify(snapshot));
        res.status(200).send('{ }');
    });
};

exports.notifyOfBooking = functions.database.ref('bookings/{bookingId}').onWrite((change, context) => {
    console.log('Calling notifyOfBooking function with change: ' + JSON.stringify(change));

    const theData = change.after.val();

    if (theData == null) {
        console.log('Not sending email because no record was received (maybe a deletion occurred).');
        return change;
    }

    const booking = theData.booking;
    const emailWelcome = 'New message from your website';
    const bookingFrom = 'Message from: ' + booking.name;
    const bookingEmail = 'Email: ' + booking.email
    const bookingSubject = booking.subject ? 'Subject: ' + booking.subject : 'no subject';
    const bookingTelephone = booking.telephone ? 'Telephone: ' + booking.telephone : 'no telephone number';
    const bookingMessage = 'Message: ' + booking.message;

    const emailBody = emailWelcome + '\n' + bookingFrom + '\n' + bookingEmail + '\n' + bookingSubject + '\n' + bookingTelephone + '\n\n' + bookingMessage;

    const mailOptions = {
        from: `${EMAIL_FROM} <jana.jurakova.makeup@gmail.com>`,
        to: 'jana.jurakova.makeup@gmail.com',
        subject: 'makeupByJana.com - ' + bookingSubject,
        text: emailBody
    };

    console.log('Sending email. ' + JSON.stringify(mailOptions));

    return transporter.sendMail(mailOptions).then(() => {
        console.log('Email successfully sent');
    }).catch((err) => {
        console.error('Email not sent: ' + err);
    });
});
