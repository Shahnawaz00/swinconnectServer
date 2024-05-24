const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bodyParser = require('body-parser');
const cors = require('cors');

const prisma = new PrismaClient();
const app = express();

app.use(bodyParser.json());
app.use(cors());
app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    try {
      const user = await prisma.user.create({
        data: { name, email, password }
      });
      res.json(user);
    } catch (error) {
      if (error.code === 'P2002' && error.meta.target.includes('email')) {
        res.status(400).json({ error: 'Email already exists' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });
  

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({
    where: { email }
  });
  if (user && user.password === password) {
    res.json(user);
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Follow a User
app.post('/follow', async (req, res) => {
  const { userId, followId } = req.body;
  try {
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        following: {
          connect: { id: parseInt(followId) }
        }
      }
    });
    res.json({ message: 'User followed successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to follow user' });
  }
});

// Unfollow a User
app.post('/unfollow', async (req, res) => {
  const { userId, unfollowId } = req.body;
  try {
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        following: {
          disconnect: { id: parseInt(unfollowId) }
        }
      }
    });
    res.json({ message: 'User unfollowed successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to unfollow user' });
  }
});

app.get('/liked-posts', async (req, res) => {

    let userIdStr = req.query.userId;

    // Remove any double quotes
    if (userIdStr.startsWith('"') && userIdStr.endsWith('"')) {
        userIdStr = userIdStr.slice(1, -1);
    }

    // Parse the cleaned string
    const userId = parseInt(userIdStr, 10);

    if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }
    console.log(userId);
    try {
        const likedPosts = await prisma.like.findMany({
        where: { userId },
        include: { post: true }
        });
        res.json(likedPosts);
    } catch (error) {
        console.error('Error fetching liked posts:', error);
        res.status(500).json({ error: 'Failed to fetch liked posts' });
    }
    }
);
// Fetch Followed Users
app.get('/followed-users', async (req, res) => {
    let userIdStr = req.query.userId;

    // Remove any double quotes
    if (userIdStr.startsWith('"') && userIdStr.endsWith('"')) {
        userIdStr = userIdStr.slice(1, -1);
    }

    // Parse the cleaned string
    const userId = parseInt(userIdStr, 10);

    if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { following: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user.following);
    } catch (error) {
        console.error('Error fetching followed users:', error);
        res.status(500).json({ error: 'Failed to fetch followed users' });
    }
});

app.get('/following-posts', async (req, res) => {
    let userIdStr = req.query.userId;

    // Remove any double quotes
    if (userIdStr.startsWith('"') && userIdStr.endsWith('"')) {
        userIdStr = userIdStr.slice(1, -1);
    }

    // Parse the cleaned string
    const userId = parseInt(userIdStr, 10);

    if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                following: {
                    select: {
                        Posts: true
                    }
                }
            }
        });     

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const posts = user.following.map((followedUser) => followedUser.Posts).flat();
        res.json(posts);
    } catch (error) {
        console.error('Error fetching followed users\' posts:', error);
        res.status(500).json({ error: 'Failed to fetch followed users\' posts' });
    }
});


// Fetch All Users
app.get('/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        res.json(users);
        }
        catch (error) {
        console.error('Error fetching users:', error);
        res.status(400).json({ error: 'Failed to fetch users' });
        }
});
app.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, password } = req.body;
    try {
      const user = await prisma.user.update({
        where: { id: parseInt(id) },
        data: { name, email, password }
      });
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update user' });
    }
  });
// GET user profile by userId
app.get('/users/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
        select: {
          id: true,
          name: true,
          email: true,
          posts: true,
        },
      });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });

  // GET posts by userId
app.get('/user-posts', async (req, res) => {
    const { userId } = req.query;
    try {
      const posts = await prisma.post.findMany({
        where: { authorId: parseInt(userId) },
        include: {
          comments: true,
          likes: true,
        },
      });
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user posts' });
    }
  });
  
// Search Users
app.get('/search-users', async (req, res) => {
    const { q } = req.query;
    try {
        if (!q) {
            const users = await prisma.user.findMany();
            res.json(users);
        } else {
            const users = await prisma.user.findMany({
                where: {
                    email: {
                        contains: q
                    }
                }
            });
            res.json(users);
        }
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(400).json({ error: 'Failed to search users' });
    }
});


// Create a Post
app.post('/posts', async (req, res) => {
    const { title, content, userId } = req.body;
    try {
      const post = await prisma.post.create({
        data: { title, content, authorId: parseInt(userId) }
      });
      res.json(post);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create post' });
    }
  });

app.delete('/posts/:postId', async (req, res) => {
    const { postId } = req.params;
    console.log(postId);
    try {
      await prisma.post.delete({
        where: { id: parseInt(postId) }
      });
      res.json({ message: 'Post deleted' });
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete post' });
    }
  });
  // Fetch a single post by ID
app.get('/posts/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const post = await prisma.post.findUnique({
        where: { id: parseInt(id) },
        include: {
          comments: {
            include: {
              user: true
            }
          },
          likes: true
        }
      });
      res.json(post);
    } catch (error) {
      res.status(400).json({ error: 'Failed to fetch post details' });
    }
  });
  
 
// Fetch likes for a post
app.get('/likes', async (req, res) => {
    const { postId } = req.query;
    try {
      const likes = await prisma.like.findMany({
        where: { postId: parseInt(postId) },
        include: { user: true }
      });
      res.json(likes);
    } catch (error) {
      console.error('Error fetching likes:', error);
      res.status(400).json({ error: 'Failed to fetch likes' });
    }
  });

  
  app.delete('likes/:id', async (req, res) => {
    const { id, userId } = req.params;
    try {
      await prisma.like.delete({
        where: { postId: parseInt(id), userId: parseInt(userId) }
      });
      res.json({ message: 'Like removed' });
    } catch (error) {
      console.error('Error removing like:', error);
      res.status(400).json({ error: 'Failed to remove like' });
    }
  });
    
  // Fetch Posts for Logged-in User
  app.get('/user-posts', async (req, res) => {
    const userId = parseInt(req.query.userId);
    try {
      const posts = await prisma.post.findMany({
        where: { authorId: userId }
      });
      res.json(posts);
    } catch (error) {
      res.status(400).json({ error: 'Failed to fetch posts' });
    }
  });

  // Add a like to a post
app.post('/like', async (req, res) => {
    const { postId, userId } = req.body;
    try {
      const like = await prisma.like.create({
        data: { postId: parseInt(postId), userId: parseInt(userId) }
      });
      res.json(like);
    } catch (error) {
      console.error('Error liking post:', error);
      res.status(400).json({ error: 'Failed to like post' });
    }
  });
  
  // Remove a like from a post
  app.delete('/like', async (req, res) => {
    const { postId, userId } = req.body;
    try {
      await prisma.like.deleteMany({
        where: {
          postId: parseInt(postId),
          userId: parseInt(userId)
        }
      });
      res.json({ message: 'Like removed' });
    } catch (error) {
      console.error('Error removing like:', error);
      res.status(400).json({ error: 'Failed to remove like' });
    }
  });
  
  // Add a comment to a post
  app.post('/comment', async (req, res) => {
    const { postId, userId, content } = req.body;
    try {
      const comment = await prisma.comment.create({
        data: { postId: parseInt(postId), userId: parseInt(userId), content }
      });
      res.json(comment);
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(400).json({ error: 'Failed to add comment' });
    }
  });
  
  // Fetch comments for a post
  app.get('/comments', async (req, res) => {
    const { postId } = req.query;
    try {
      const comments = await prisma.comment.findMany({
        where: { postId: parseInt(postId) },
        include: { user: true }
      });
      res.json(comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(400).json({ error: 'Failed to fetch comments' });
    }
  });
  

// Start Server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
