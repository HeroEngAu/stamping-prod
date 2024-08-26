const express = require('express');
const multer = require('multer');
const AdmZip = require('adm-zip');
const JSZip = require('jszip');
const { PDFDocument, rgb } = require('pdf-lib');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 7000;

// Set up EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

// Serve static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, '/public')));

const upload = multer({ dest: '/stamping/uploads/' });

app.get('/', (req, res) => {
    res.render('Stamping');
});


// Function to get stamp properties based on the stamp type
const getStampProperties = (stamptype) => {
    switch (stamptype) {
        case 1:
            return {
                imagePath: path.join(__dirname, 'public', 'herostamp.png'),
                position: { x: 20, y: 20, textX: 100, textY: 88 }
            };
        case 2:
            return {
                imagePath: path.join(__dirname, 'public', 'asbuilt.png'),
                position: { x: 50, y: 50, textX: 50, textY: 0 }
            };
        case 3:
            return {
                imagePath: path.join(__dirname, 'public', 'cconstruction.png'),
                position: { x: 80, y: 80, textX: 200, textY: 200 }
            };
        default:
            throw new Error('Invalid stamptype');
    }
};

const processPdf = async (pdfBuffer, sdate, issued, stamptype) => {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
     if (pages.length === 0) {
        throw new Error("The PDF does not contain any pages.");
    }
    const firstPage = pages[0]; // Get the first page
    
    const { imagePath, position } = getStampProperties(parseInt(stamptype, 10));

    // Load the stamp image and convert it to base64
    const stampImageBuffer = fs.readFileSync(imagePath);
    const stampImageBase64 = stampImageBuffer.toString('base64');
    const stampImageBytes = Uint8Array.from(Buffer.from(stampImageBase64, 'base64'));

    // Embed the PNG stamp image into the PDF
    const stampPdfImage = await pdfDoc.embedPng(stampImageBytes);

    
        const { width, height } = firstPage.getSize();

        // Define the dimensions and positions of the stamp
        const stampWidth = 250;
        const stampHeight = 190;
        const paddingFromBottom = 15 * 28.3464567; // 15 cm in points (1 cm = 28.3464567 points)
        const paddingFromLeft = position.x;

        const x = paddingFromLeft;
        const y = height - paddingFromBottom - stampHeight + position.y;

        // Draw the stamp image
        firstPage.drawImage(stampPdfImage, {
            x: x,
            y: y,
            width: stampWidth,
            height: stampHeight,
        });

        // Add text to the stamp
        firstPage.drawText(`${sdate}`, {
            x: x + position.textX,
            y: y + stampHeight - position.textY,
            size: 14,
            color: rgb(0, 0, 1) // blue color
        });

        firstPage.drawText(`${issued}`, {
            x: x + position.textX,
            y: y + stampHeight - (position.textY + 20), // Adjust Y position if needed
            size: 14,
            color: rgb(0, 0, 1) // blue color
        });
    

    return pdfDoc.save();
};

app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileType = req.file.mimetype;
    const fileName = req.file.originalname;
    const fileExtension = path.extname(fileName).toLowerCase();
    const sdate = req.body.sdate;
    const issued = req.body.issuedto;
    const stamptype = req.body.stamptype;

    console.log(`File received: ${fileName}`);
    console.log(`MIME type: ${fileType}`);
    console.log(`File extension: ${fileExtension}`);

    try {
        if (fileExtension === '.zip' || fileType === 'application/zip') {
            const zip = new AdmZip(filePath);
            const zipEntries = zip.getEntries();
            const outputDir = 'processed/';

            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir);
            }

            let processedFiles = 0;
            let jsZip = new JSZip();

            for (const entry of zipEntries) {
                if (!entry.isDirectory && entry.entryName.endsWith('.pdf')) {
                    const pdfBuffer = entry.getData();
                    const processedPdfBytes = await processPdf(pdfBuffer, sdate, issued, stamptype);

                    const outputFileName = entry.entryName;
                    jsZip.file(outputFileName, processedPdfBytes);
                    processedFiles++;
                }
            }

            if (processedFiles > 0) {
                const zipBuffer = await jsZip.generateAsync({ type: 'nodebuffer' });
                const outputPath = path.join(outputDir, 'stamped.zip');
                fs.writeFileSync(outputPath, zipBuffer);
                const downloadUrl = `/stamping/processed/stamped.zip`;
                res.json({ processedFiles, downloadUrl });
            } else {
                res.json({ processedFiles });
            }
        } else if (fileExtension === '.pdf' || fileType === 'application/pdf') {
            const pdfBuffer = fs.readFileSync(filePath);
            const processedPdfBytes = await processPdf(pdfBuffer, sdate, issued, stamptype);

            const outputFileName = 'stamped.pdf';
            const outputPath = path.join(__dirname, 'processed', outputFileName);
            fs.writeFileSync(outputPath, processedPdfBytes);

            const downloadUrl = `/stamping/processed/${outputFileName}`;
            res.json({ processedFiles: 1, downloadUrl });
        } else {
            res.status(400).json({ error: 'Unsupported file type' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        // Cleanup
        fs.unlinkSync(filePath);
    }
});

app.use('/processed', express.static(path.join(__dirname, 'processed')));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
