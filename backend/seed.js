require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

const MONGO_URI = process.env.MONGO_URI;

const sampleProducts = [
    {
        name: 'Truffle Burger',
        price: 18,
        category: 'Main',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=60',
        description: 'Juicy beef patty with truffle aioli'
    },
    {
        name: 'Lobster Pasta',
        price: 28,
        category: 'Main',
        image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=500&q=60',
        description: 'Fresh lobster with creamy linguine'
    },
    {
        name: 'Caesar Salad',
        price: 12,
        category: 'Starter',
        image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=500&q=60',
        description: 'Crisp romaine with parmesan crisp'
    },
    {
        name: 'Tiramisu',
        price: 10,
        category: 'Dessert',
        image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=500&q=60',
        description: 'Classic Italian coffee dessert'
    },
    {
        name: 'Mojito',
        price: 8,
        category: 'Drinks',
        image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=500&q=60',
        description: 'Refreshing mint and lime cocktail'
    }
];

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('MongoDB Connected');
        await Product.deleteMany({}); // Clear existing
        await Product.insertMany(sampleProducts);
        console.log('Database seeded successfully');
        mongoose.connection.close();
    })
    .catch(err => {
        console.error(err);
        mongoose.connection.close();
    });
