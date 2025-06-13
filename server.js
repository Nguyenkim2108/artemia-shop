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
    serverSelectionTimeoutMS: 5000 // Thời gian chờ kết nối
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

// Middleware xác thực cho trang admin (tùy chọn)
app.use('/admin', (req, res, next) => {
    const auth = req.headers['authorization'];
    if (!auth || auth !== 'Basic YWRtaW46cGFzc3dvcmQ=') { // Base64 của "admin:password"
        res.status(401).send('Unauthorized. Use Basic Auth with username: admin, password: password');
        return;
    }
    next();
});

// API endpoints
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

app.post('/api/products', upload.single('image'), async (req, res) => {
    try {
        const { name, price, category, url } = req.body;
        let image = req.file ? `/uploads/${req.file.filename}` : '';
        if (url) {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            image = `data:image/jpeg;base64,${Buffer.from(response.data).toString('base64')}`;
        }
        const product = new Product({ name, price, category, image });
        await product.save();
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: 'Failed to add product' });
    }
});

app.put('/api/products/:id', upload.single('image'), async (req, res) => {
    try {
        const { name, price, category, url } = req.body;
        let image = req.file ? `/uploads/${req.file.filename}` : '';
        if (url) {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            image = `data:image/jpeg;base64,${Buffer.from(response.data).toString('base64')}`;
        }
        const product = await Product.findByIdAndUpdate(req.params.id, { name, price, category, image }, { new: true });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update product' });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

app.post('/api/subpages', async (req, res) => {
    try {
        const subpage = new Subpage(req.body);
        await subpage.save();
        res.json(subpage);
    } catch (err) {
        res.status(500).json({ error: 'Failed to add subpage' });
    }
});

app.put('/api/subpages/:id', async (req, res) => {
    try {
        const subpage = await Subpage.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(subpage);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update subpage' });
    }
});

app.delete('/api/subpages/:id', async (req, res) => {
    try {
        await Subpage.findByIdAndDelete(req.params.id);
        res.json({ message: 'Subpage deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete subpage' });
    }
});

app.post('/api/theme', upload.single('logo'), async (req, res) => {
    try {
        const { color, name } = req.body;
        let logo = req.file ? `/uploads/${req.file.filename}` : '';
        const theme = await Theme.findOneAndUpdate({}, { color, name, logo }, { upsert: true, new: true });
        res.json(theme);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update theme' });
    }
});

app.get('/api/theme', async (req, res) => {
    try {
        const theme = await Theme.findOne();
        res.json(theme);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch theme' });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Failed to add user' });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find();
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const order = new Order(req.body);
        await order.save();
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: 'Failed to add order' });
    }
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
    res.status(500).send('Something broke!');
});

// Khởi động server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});