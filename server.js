
require('dotenv').config(); 
const express = require('express');
const fs = require('fs');
const path = require('path'); 
const cors = require('cors');
const helmet = require('helmet'); 
const morgan = require('morgan'); 

const app = express();
const PORT = process.env.PORT || 3000; 

// ---------------------------------
app.use(cors());      
app.use(helmet());    
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 
app.use(morgan('dev')); 

// ---------------------------------
const carsData = {}; 

try {
    const files = fs.readdirSync(__dirname).filter(file => file.startsWith('Car') && file.endsWith('.json'));

    files.forEach(file => {
        const brandName = path.basename(file, '.json').replace('Car', '').toLowerCase();
        const fileContent = fs.readFileSync(path.join(__dirname, file), 'utf8');
        carsData[brandName] = JSON.parse(fileContent);
        console.log(`✅ Data loaded for [${brandName}] successfully.`);
    });
    console.log('🎉 All cars data has been loaded into memory.');
} catch (error) {
    console.error('❌ CRITICAL ERROR: Could not load car data. Server is shutting down.', error);
    process.exit(1); 
}

// ---------------------------------

// --- Welcome Route ---
app.get('/', (req, res) => {
    res.send('<h1>🚀 Car API is ready and running!</h1><p>Try endpoints like /api/cars/all</p>');
});

// --- GET All Cars (with pagination) ---
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
        results: results
    });
});

app.get('/api/cars/:brandName', (req, res) => {
    const brandName = req.params.brandName.toLowerCase();
    const brandData = carsData[brandName];

    if (brandData) {
        res.status(200).json({
            info: { totalCars: brandData.length },
            results: brandData
        });
    } else {
        res.status(404).json({ message: `Brand '${req.params.brandName}' not found.` });
    }
});

app.get('/api/cars/search', (req, res) => {
    const { title, model, color, maxPrice, page = 1, limit = 20 } = req.query;
    let results = Object.values(carsData).flat();

    // Filter logic
    if (title) {
        results = results.filter(car => car.title.toLowerCase().includes(title.toLowerCase()));
    }
    if (model) {
        results = results.filter(car => car.model === parseInt(model));
    }
    if (color) {
        results = results.filter(car => car.color.toLowerCase().includes(color.toLowerCase()));
    }
    if (maxPrice) {
        results = results.filter(car => car.price <= parseInt(maxPrice));
    }

    // Pagination logic
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = parseInt(page) * parseInt(limit);
    const paginatedResults = results.slice(startIndex, endIndex);

    res.status(200).json({
        info: {
            totalCarsFound: results.length,
            totalPages: Math.ceil(results.length / parseInt(limit)),
            currentPage: parseInt(page),
            carsOnPage: paginatedResults.length
        },
        results: paginatedResults
    });
});

// --- POST Route to add a car (temporary) ---
app.post('/api/cars', (req, res) => {
    const { name, model, price, brand = 'newlyadded' } = req.body;
    
    if (!name || !model || !price) {
        return res.status(400).json({ message: 'Missing required fields: name, model, price.' });
    }

    const newCar = {
        _id: `temp_${Date.now()}`,
        name,
        model: parseInt(model),
        price: parseFloat(price),
        ...req.body
    };

    const brandKey = brand.toLowerCase();
    if (!carsData[brandKey]) {
        carsData[brandKey] = [];
    }
    carsData[brandKey].push(newCar);

    console.log(`Car added to memory in brand [${brandKey}]:`, newCar);
    res.status(201).json({ message: 'Car added successfully (in-memory only)', car: newCar });
});

// ---------------------------------

// --- 404 Not Found Handler ---
app.use((req, res, next) => {
    res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
    console.error(err.stack); // اطبع تفاصيل الـ error في الـ console بتاع السيرفر
    res.status(500).json({ message: 'Something went wrong on the server!' });
});


// ---------------------------------
app.listen(PORT, () => {
    console.log(`🚀 Server is listening on http://localhost:${PORT}`);
});