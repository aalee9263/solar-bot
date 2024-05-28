const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const calendar = google.calendar('v3');
const sheets = google.sheets('v4');
const pdf = require('html-pdf');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files (HTML, JS, CSS)
app.use(express.static('public'));

// Handle POST request from Dialogflow CX for booking survey appointment
app.post('/book-survey', async (req, res) => {
    const { userName, surveyDate, surveyTime } = req.body;

    try {
        // Call function to book survey appointment
        const calendarLink = await bookSurvey(userName, surveyDate, surveyTime);

        // Call function to update user data in Google Sheets
        await updateUserData(userName, surveyDate, surveyTime);

        res.status(200).json({ message: 'Survey booked successfully', calendarLink });
    } catch (error) {
        console.error('Error booking survey:', error);
        res.status(500).json({ error: 'Failed to book survey' });
    }
});

// Handle POST request from Dialogflow CX for generating quotation PDF
app.post('/generate-quotation', (req, res) => {
    const { solarPanelWatts, inverterEfficiency, numberOfPanels } = req.body;

    // Perform calculations
    const totalWatts = parseFloat(solarPanelWatts) * parseInt(numberOfPanels) * parseFloat(inverterEfficiency);
    const totalPrice = totalWatts * 0.1; // Example calculation, adjust as needed

    // Generate HTML dynamically with calculated values
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Dynamic Quotation</title>
            <style>
                /* Your CSS styles for the quotation */
            </style>
        </head>
        <body>
            <div class="quotation">
                <h1>Quotation</h1>
                <div id="quotationDetails">
                    <p>Total Watts: ${totalWatts.toFixed(2)} Watts</p>
                    <p>Total Price: $${totalPrice.toFixed(2)}</p>
                </div>
            </div>
        </body>
        </html>
    `;

    // Create PDF from HTML
    pdf.create(htmlContent).toFile('./quotation.pdf', (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error generating PDF');
        }
        res.sendFile(`${__dirname}/quotation.pdf`);
    });
});

// Function to book a survey appointment
async function bookSurvey(userName, surveyDate, surveyTime) {
    const auth = new google.auth.GoogleAuth({
        // Your Google Calendar credentials and scopes here
    });
    const calendarId = 'primary'; // Assuming the calendar ID is 'primary'

    try {
        const calendarEvent = await calendar.events.insert({
            auth: auth,
            calendarId: calendarId,
            resource: {
                summary: `Survey for ${userName}`,
                start: {
                    dateTime: `${surveyDate}T${surveyTime}:00`,
                    timeZone: 'Your Time Zone',
                },
                end: {
                    dateTime: `${surveyDate}T${surveyTime}:00`,
                    timeZone: 'Your Time Zone',
                },
            },
        });

        console.log('Event created: %s', calendarEvent.data.htmlLink);
        return calendarEvent.data.htmlLink;
    } catch (error) {
        console.error('Error creating event:', error);
        throw new Error('Failed to book survey');
    }
}

// Function to update user data in Google Sheets
async function updateUserData(userName, surveyDate, surveyTime) {
    const auth = new google.auth.GoogleAuth({
        // Your Google Sheets credentials and scopes here
    });
    const spreadsheetId = 'Your Spreadsheet ID';
    const range = 'Sheet1!A1:C1'; // Update the range as per your sheet

    const request = {
        auth: auth,
        spreadsheetId: spreadsheetId,
        range: range,
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: [
                [userName, surveyDate, surveyTime],
            ],
        },
    };

    try {
        const response = await sheets.spreadsheets.values.update(request);
        console.log('Sheet updated:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error updating sheet:', error);
        throw new Error('Failed to update user data');
    }
}

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
