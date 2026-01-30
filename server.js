require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

const PORT = process.env.PORT || 3000;

// ================= Middleware =================
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ================= Load Cars Data =================
const carsData = {};

try {
    const files = fs
        .readdirSync(__dirname)
        .filter(file => file.startsWith('Car') && file.endsWith('.json'));

    files.forEach(file => {
        // بنشيل كلمة Car ونحول لـ lowercase عشان نستخدمها كـ Key
        const brandName = path
            .basename(file, '.json')
            .replace('Car', '')
            .trim()
            .toLowerCase();

        const fileContent = fs.readFileSync(
            path.join(__dirname, file),
            'utf8'
        );

        carsData[brandName] = JSON.parse(fileContent);
        console.log(`✅ Data loaded for [${brandName}]`);
    });

    console.log('🎉 All cars data loaded successfully');
} catch (error) {
    console.error('❌ Failed to load car data', error);
    process.exit(1);
}

// ================= Routes =================

// Welcome
app.get('/', (req, res) => {
    res.send('<h1>🚀 Horus AI Car API is ready and running!</h1>');
});

// ---------- GET ALL CARS ----------
app.get('/api/cars/all', (req, res) => {
    const allCars = Object.values(carsData).flat();

    if (req.query.pagination === 'false') {
        return res.status(200).json({
            info: { totalCars: allCars.length },
            results: allCars
        });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const results = allCars.slice(startIndex, endIndex);

    res.status(200).json({
        info: {
            totalCars: allCars.length,
            totalPages: Math.ceil(allCars.length / limit),
            currentPage: page,
            carsOnPage: results.length
        },
        results
    });
});

// ---------- SEARCH ----------
app.get('/api/cars/search', (req, res) => {
    const { title, model, color, maxPrice, page = 1, limit = 20 } = req.query;
    let results = Object.values(carsData).flat();

    if (title) {
        results = results.filter(car =>
            car.title?.toLowerCase().includes(title.toLowerCase())
        );
    }

    if (model) {
        results = results.filter(
            car => car.model === parseInt(model)
        );
    }

    if (color) {
        results = results.filter(car =>
            car.color?.toLowerCase().includes(color.toLowerCase())
        );
    }

    if (maxPrice) {
        results = results.filter(
            car => car.price <= parseInt(maxPrice)
        );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedResults = results.slice(startIndex, endIndex);

    res.status(200).json({
        info: {
            totalCarsFound: results.length,
            totalPages: Math.ceil(results.length / limit),
            currentPage: parseInt(page),
            carsOnPage: paginatedResults.length
        },
        results: paginatedResults
    });
});

// ---------- CAR DETAILS (تم التعديل هنا) ----------
app.get('/api/cars/:brandName/:id', (req, res) => {
    const brandName = req.params.brandName.trim().toLowerCase();
    const id = req.params.id;

    const brandData = carsData[brandName];

    if (!brandData) {
        return res.status(404).json({ 
            success: false,
            message: `Brand '${brandName}' not found.` 
        });
    }

    // تم تغيير _id لـ id بناءً على شكل ملفاتك
    const car = brandData.find(
        car => String(car.id) === String(id)
    );

    if (!car) {
        return res.status(404).json({ 
            success: false,
            message: `Car with ID [${id}] not found in ${brandName}.` 
        });
    }

    res.status(200).json({
        success: true,
        message: 'Car details fetched successfully',
        car
    });
});

// ---------- CARC BY BRAND ----------
app.get('/api/cars/:brandName', (req, res) => {
    const brandName = req.params.brandName.toLowerCase().trim();
    const brandData = carsData[brandName];

    if (!brandData) {
        return res.status(404).json({ 
            success: false,
            message: `Brand '${req.params.brandName}' not found.` 
        });
    }

    res.status(200).json({
        info: { totalCars: brandData.length },
        results: brandData
    });
});

// ---------- ADD CAR (IN-MEMORY) ----------
app.post('/api/cars', (req, res) => {
    const { title, model, price, brand } = req.body;

    if (!title || !model || !price || !brand) {
        return res.status(400).json({
            message: 'Missing required fields: title, model, price, brand.'
        });
    }

    const brandKey = brand.toLowerCase().trim();
    const newCar = {
        id: Date.now(), // ID فريد مؤقت
        title,
        model: parseInt(model),
        price: parseFloat(price),
        ...req.body
    };

    if (!carsData[brandKey]) {
        carsData[brandKey] = [];
    }

    carsData[brandKey].push(newCar);

    res.status(201).json({
        message: 'Car added successfully (in-memory only)',
        car: newCar
    });
});

// ================= Error Handling =================
app.use((req, res) => {
    res.status(404).json({
        message: `Route not found: ${req.originalUrl}`
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Something went wrong on the server!'
    });
});

// ================= Start Server =================
app.listen(PORT, () => {
    console.log(`🚀 Horus AI Server is listening on http://localhost:${PORT}`);
});