const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

// Google Cloud Storage ko initialize karen
const storage = new Storage({ keyFilename: 'path/to/your-service-account-file.json' });
const bucketName = 'your-bucket-name';

async function generatePDF(htmlContent, pdfPath) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await page.pdf({ path: pdfPath, format: 'A4' });
    await browser.close();
}

async function uploadToGCS(filePath, destination) {
    await storage.bucket(bucketName).upload(filePath, {
        destination: destination,
        public: true,
    });
    return `https://storage.googleapis.com/${bucketName}/${destination}`;
}

app.post('/webhook', async (req, res) => {
    const params = req.body.sessionInfo.parameters;
    const name = params.name;
    const age = params.age;
    const score = params.score;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Report</title>
        <style>
            body { font-family: Arial, sans-serif; }
            h1 { color: #333; }
            p { font-size: 16px; }
        </style>
    </head>
    <body>
        <h1>Report</h1>
        <p>Name: ${name}</p>
        <p>Age: ${age}</p>
        <p>Score: ${score}</p>
    </body>
    </html>
    `;

    const pdfFilePath = path.join(__dirname, 'output.pdf');
    const gcsDestination = 'path/to/output.pdf';

    try {
        // HTML ko PDF mein convert karen
        await generatePDF(htmlContent, pdfFilePath);

        // Google Cloud Storage mein upload karen
        const publicUrl = await uploadToGCS(pdfFilePath, gcsDestination);

        // PDF URL ke sath response bhejen
        res.json({
            fulfillmentResponse: {
                messages: [
                    {
                        text: {
                            text: [`Here is your PDF: ${publicUrl}`],
                        },
                    },
                ],
            },
        });
    } catch (error) {
        console.error('Error generating or uploading PDF:', error);
        res.status(500).send('Internal Server Error');
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
