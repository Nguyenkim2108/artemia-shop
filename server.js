const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ dest: 'uploads/' });

// Kết nối MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/artemia-shop', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000
}).then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err.message));

// Schema
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    image: String
});
const subpageSchema = new mongoose.Schema({ name: { type: String, required: true } });
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: String
});
const orderSchema = new mongoose.Schema({
    products: [Object],
    status: { type: String, default: 'Pending' },
    orderCode: { type: String, required: true, unique: true }
});
const themeSchema = new mongoose.Schema({
    color: String,
    name: String,
    logo: String
});

const Product = mongoose.model('Product', productSchema);
const Subpage = mongoose.model('Subpage', subpageSchema);
const User = mongoose.model('User', userSchema);
const Order = mongoose.model('Order', orderSchema);
const Theme = mongoose.model('Theme', themeSchema);

// API endpoints
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch products', details: err.message });
    }
});

app.post('/api/products', upload.single('image'), async (req, res) => {
    try {
        const { name, price, category } = req.body;
        if (!name || !price || !category) {
            return res.status(400).json({ error: 'Missing required fields (name, price, category)' });
        }
        let image = req.file ? `/uploads/${req.file.filename}` : '';
        if (req.body.url) {
            const response = await axios.get(req.body.url, { responseType: 'arraybuffer' });
            image = `data:image/jpeg;base64,${Buffer.from(response.data).toString('base64')}`;
        }
        const product = new Product({ name, price, category, image });
        await product.save();
        res.status(201).json(product);
    } catch (err) {
        res.status(500).json({ error: 'Failed to add product', details: err.message });
    }
});

app.put('/api/products/:id', upload.single('image'), async (req, res) => {
    try {
        const { name, price, category } = req.body;
        if (!name || !price || !category) {
            return res.status(400).json({ error: 'Missing required fields (name, price, category)' });
        }
        let image = req.file ? `/uploads/${req.file.filename}` : '';
        if (req.body.url) {
            const response = await axios.get(req.body.url, { responseType: 'arraybuffer' });
            image = `data:image/jpeg;base64,${Buffer.from(response.data).toString('base64')}`;
        }
        const product = await Product.findByIdAndUpdate(req.params.id, { name, price, category, image }, { new: true, runValidators: true });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update product', details: err.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete product', details: err.message });
    }
});

app.post('/api/subpages', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Missing required field (name)' });
        const subpage = new Subpage({ name });
        await subpage.save();
        res.status(201).json(subpage);
    } catch (err) {
        res.status(500).json({ error: 'Failed to add subpage', details: err.message });
    }
});

app.put('/api/subpages/:id', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Missing required field (name)' });
        const subpage = await Subpage.findByIdAndUpdate(req.params.id, { name }, { new: true, runValidators: true });
        if (!subpage) return res.status(404).json({ error: 'Subpage not found' });
        res.json(subpage);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update subpage', details: err.message });
    }
});

app.delete('/api/subpages/:id', async (req, res) => {
    try {
        const subpage = await Subpage.findByIdAndDelete(req.params.id);
        if (!subpage) return res.status(404).json({ error: 'Subpage not found' });
        res.json({ message: 'Subpage deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete subpage', details: err.message });
    }
});

app.post('/api/theme', upload.single('logo'), async (req, res) => {
    try {
        const { color, name } = req.body;
        let logo = req.file ? `/uploads/${req.file.filename}` : '';
        const theme = await Theme.findOneAndUpdate({}, { color, name, logo }, { upsert: true, new: true, runValidators: true });
        res.json(theme);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update theme', details: err.message });
    }
});

app.get('/api/theme', async (req, res) => {
    try {
        const theme = await Theme.findOne();
        res.json(theme || {});
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch theme', details: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Missing required fields (username, password)' });
        const user = new User({ username, password, phone: req.body.phone });
        await user.save();
        res.status(201).json(user);
    } catch (err) {
        res.status(500).json({ error: 'Failed to add user', details: err.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete user', details: err.message });
    }
});

app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find();
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch orders', details: err.message });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const { products, orderCode } = req.body;
        if (!products || !orderCode) return res.status(400).json({ error: 'Missing required fields (products, orderCode)' });
        const order = new Order({ products, orderCode });
        await order.save();
        res.status(201).json(order);
    } catch (err) {
        res.status(500).json({ error: 'Failed to add order', details: err.message });
    }
});

app.get('/api/track/:orderCode', async (req, res) => {
    try {
        const response = await axios.get(`https://donhang.ghn.vn/api/v1/tracking?order_code=${req.params.orderCode}`, {
            headers: { 'Token': 'ce9d8e0d-45a2-11f0-b800-96cca69abf1f' }
        });
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: 'Error tracking order', details: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });
        const user = await User.findOne({ username, password });
        if (!user) return res.status(401).json({ error: 'Invalid username or password' });
        res.status(200).json({ message: 'Login successful', user });
    } catch (err) {
        res.status(500).json({ error: 'Failed to login', details: err.message });
    }
});

// Định tuyến riêng cho admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Định tuyến mặc định
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Xử lý lỗi chung
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Khởi động server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});