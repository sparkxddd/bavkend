const express = require('express');
const router = express.Router();

/**
 * MOCK PROVIDER DATABASE
 * In a real app, this would query a PostgreSQL/MongoDB database with Geospatial support.
 */
const PROVIDERS = [
    { id: '1', name: 'John Doe', service: 'plumbing', rating: 4.8, jobs: 120, lat: 0, lon: 0, price: 45, image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John' },
    { id: '2', name: 'Mike Smith', service: 'electrical', rating: 4.9, jobs: 85, lat: 0, lon: 0, price: 55, image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike' },
    { id: '3', name: 'Rapid Towing', service: 'towing', rating: 4.7, jobs: 310, lat: 0, lon: 0, price: 90, image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Towing' },
    { id: '4', name: 'Sarah Fix', service: 'mechanic', rating: 5.0, jobs: 42, lat: 0, lon: 0, price: 60, image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
    { id: '5', name: 'Emergency Plumbers', service: 'emergency', rating: 4.6, jobs: 500, lat: 0, lon: 0, price: 120, image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emergency' },
    { id: '6', name: 'Cool HVAC', service: 'hvac', rating: 4.8, jobs: 200, lat: 0, lon: 0, price: 80, image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Cool' },
];

router.get('/', (req, res) => {
    const { service, location } = req.query;

    // Basic filtering
    let results = PROVIDERS;

    if (service) {
        results = results.filter(p => p.service.toLowerCase() === service.toLowerCase());
    }

    // Simulate latency
    setTimeout(() => {
        res.json(results);
    }, 500);
});

module.exports = router;
