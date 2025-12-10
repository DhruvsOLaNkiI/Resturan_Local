const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema({
    key: { type: String, default: 'store_config', unique: true }, // Singleton config
    bannerText: { type: String, default: '' },
    discountAmount: { type: Number, default: 0 },
    isBannerActive: { type: Boolean, default: false },
    totalTables: { type: Number, default: 10 }
});

module.exports = mongoose.model('Config', ConfigSchema);
