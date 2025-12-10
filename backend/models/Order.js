const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    tableNo: { type: String, required: true },
    items: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true }, // Store price at time of order
            name: String
        }
    ],
    totalAmount: { type: Number, required: true },
    status: {
        type: String,
        default: 'Pending',
        enum: ['Pending', 'Cooking', 'Coming to Table', 'Completed']
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
