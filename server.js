require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());

app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

cloudinary.config({
  cloud_name: 'dlk0f9csv',
  api_key: '883861739698231',
  api_secret: '1CmsS8eZzmJN1nJD5fjMqdgo0Vg',
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function () {
  console.log('Connected to MongoDB');
});

const Video = mongoose.model('Video', {
  title: String,
  description: String,
  thumbnail: String,
  videoUrl: String,
});

app.post('/upload', upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'video', maxCount: 1 },
  ]), async (req, res) => {
    try {
      const [thumbnail, video] = await Promise.all([
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'thumbnails' },
            (error, result) => error ? reject(error) : resolve(result)
          );
  
          stream.end(req.files.thumbnail[0].buffer);
        }),
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { resource_type: 'video', folder: 'videos' },
            (error, result) => error ? reject(error) : resolve(result)
          );
  
          stream.end(req.files.video[0].buffer);
        }),
      ]);
  
      const newVideo = new Video({
        title: req.body.title,
        description: req.body.description,
        thumbnail: thumbnail.secure_url,
        videoUrl: video.secure_url,
      });
  
      await newVideo.save();
  
      res.status(201).json({ message: 'Video uploaded successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });



  //fetching
  app.get('/videos', async (req, res) => {
    try {
      
      const videos = await Video.find({}, 'title thumbnail videoUrl');
  
      const videosWithUrls = videos.map((video) => ({

        title: video.title,
        thumbnailUrl: cloudinary.url(video.thumbnail, { secure: true }),
        videoUrl: cloudinary.url(video.videoUrl, {secure: true}),// Secure URL
      }));
  
      res.json(videosWithUrls);
      
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
