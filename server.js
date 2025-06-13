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
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schema
const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    category: String,
    image: String
});
const subpageSchema = new mongoose.Schema({ name: String });
const userSchema = new mongoose.Schema({ username: String, password: String, phone: String });
const orderSchema = new mongoose.Schema({ products: Array, status: String, orderCode: String });
const themeSchema = new mongoose.Schema({ color: String, name: String, logo: String });

const Product = mongoose.model('Product', productSchema);
const Subpage = mongoose.model('Subpage', subpageSchema);
const User = mongoose.model('User', userSchema);
const Order = mongoose.model('Order', orderSchema);
const Theme = mongoose.model('Theme', themeSchema);

// API endpoints
app.get('/api/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

app.post('/api/products', upload.single('image'), async (req, res) => {
    const { name, price, category, url } = req.body;
    let image = req.file ? `/uploads/${req.file.filename}` : '';
    if (url) {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        image = `data:image/jpeg;base64,${Buffer.from(response.data).toString('base64')}`;
    }
    const product = new Product({ name, price, category, image });
    await product.save();
    res.json(product);
});

app.put('/api/products/:id', upload.single('image'), async (req, res) => {
    const { name, price, category, url } = req.body;
    let image = req.file ? `/uploads/${req.file.filename}` : '';
    if (url) {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        image = `data:image/jpeg;base64,${Buffer.from(response.data).toString('base64')}`;
    }
    const product = await Product.findByIdAndUpdate(req.params.id, { name, price, category, image }, { new: true });
    res.json(product);
});

app.delete('/api/products/:id', async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
});

app.post('/api/subpages', async (req, res) => {
    const subpage = new Subpage(req.body);
    await subpage.save();
    res.json(subpage);
});

app.put('/api/subpages/:id', async (req, res) => {
    const subpage = await Subpage.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(subpage);
});

app.delete('/api/subpages/:id', async (req, res) => {
    await Subpage.findByIdAndDelete(req.params.id);
    res.json({ message: 'Subpage deleted' });
});

app.post('/api/theme', upload.single('logo'), async (req, res) => {
    const { color, name } = req.body;
    let logo = req.file ? `/uploads/${req.file.filename}` : '';
    const theme = await Theme.findOneAndUpdate({}, { color, name, logo }, { upsert: true, new: true });
    res.json(theme);
});

app.get('/api/theme', async (req, res) => {
    const theme = await Theme.findOne();
    res.json(theme);
});

app.post('/api/users', async (req, res) => {
    const user = new User(req.body);
    await user.save();
    res.json(user);
});

app.delete('/api/users/:id', async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
});

app.get('/api/orders', async (req, res) => {
    const orders = await Order.find();
    res.json(orders);
});

app.post('/api/orders', async (req, res) => {
    const order = new Order(req.body);
    await order.save();
    res.json(order);
});

app.get('/api/track/:orderCode', async (req, res) => {
    try {
        const response = await axios.get(`https://donhang.ghn.vn/api/v1/tracking?order_code=${req.params.orderCode}`, {
            headers: { 'Token': 'ce9d8e0d-45a2-11f0-b800-96cca69abf1f' }
        });
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: 'Error tracking order' });
    }
});

// Phục vụ frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Khởi động server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});