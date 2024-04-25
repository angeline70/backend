const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User.js');
const Post = require ('./models/Post.js')
const bcrypt = require ('bcryptjs')
const jwt = require('jsonwebtoken');
const cookieParser = require ('cookie-parser')
const multer = require ('multer')
const uploadMiddleware = multer({dest: 'uploads/'})
const fs = require ('fs');




const salt = bcrypt.genSaltSync(10);
const secret = 'dsaa213adwq4wqdsad222dsadasa2fasd';

app.use(cors({credentials:true, origin: 'http://localhost:5173'}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'))
mongoose.connect('mongodb+srv://anarespinozaup:ntYg3ZiAwIT76Jyl@cluster0.zexl2lu.mongodb.net/blog?retryWrites=true&w=majority')
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });

  
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const userDoc = await User.create({ 
      username,
       password:bcrypt.hashSync(password,salt)
      });
    res.json(userDoc);
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post('/login', async (req, res) => {
  const{username, password} = req.body
  const userDoc = await User.findOne({username})
  const passOk = bcrypt.compareSync(password, userDoc.password)
 if(passOk) {
  //login 
  jwt.sign({username, id: userDoc._id}, secret,{}, (err, token) => {
    if(err) throw err;
    res.cookie('token', token).json({
      id:userDoc._id,
      username,
    })    

  })
 } else{
  res.status(400).json('wrong credentials');
 }

})

app.get('/profiles', (req, res) => {
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({ error: 'Token not provided' });
  }

  jwt.verify(token, secret, {}, (err, info) => {
    if (err) {
      console.error('Error verifying token:', err);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json(info);
  });
});



app.post('/logout', (req, res) => {
  res.clearCookie('token').json('ok'); 
});

app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    const { originalname } = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = req.file.path + '.' + ext;
    fs.renameSync(req.file.path, newPath);

    const {title, summary, content} = req.body
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover:newPath,

    })

    

    res.json({ postDoc});
  } catch (error) {
    console.error('Error processing file upload:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/post', async (req, res) => {
  try {
    const posts = await Post.find();
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Error fetching posts' });
  }
});

app.get('/post/:id', async (req, res) => {

  const {id} = req.params;
  const postDoc = await Post.findById(id).populate('author', ['username'])
  res.json(postDoc)
})

app.put('/post/:id', uploadMiddleware.single('file'), async (req, res) => {
  let newPath = null;
  try {
    console.log("Req.file:", req.file); 
    if (req.file) {
      const { originalname } = req.file;
      const parts = originalname.split('.');
      const ext = parts[parts.length - 1];
      newPath = req.file.path + '.' + ext;
      fs.renameSync(req.file.path, newPath);
    }

    const { id } = req.params;
    const { title, summary, content } = req.body;

    const postDoc = await Post.findById(id);
    if (!postDoc) return res.status(404).json({ error: 'Post not found' });

    postDoc.title = title;
    postDoc.summary = summary;
    postDoc.content = content;
    postDoc.cover = newPath ? newPath : postDoc.cover;
    await postDoc.save();

    res.json(postDoc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/post/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedPost = await Post.findByIdAndDelete(id);
    if (!deletedPost) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

