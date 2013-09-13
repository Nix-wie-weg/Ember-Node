/**
 * Module dependencies.
 */

var express = require('express');
var mongoose = require('mongoose');
var assets = require('connect-assets');
var phantom = require('phantom');
var redis = require("redis");
var client = redis.createClient();
var app = express();


var phantomProcess = null;
phantom.create(function(ph) { phantomProcess = ph; });

// all environments
app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.logger());
  app.use(express.favicon());
  app.use(express.json());
  app.use(assets());
})

// development only
if ('development' == app.get('env')) {
  app.configure(function(){
    app.use(express.errorHandler());
    app.use(express.logger('dev'));
    app.set('dbPath', 'mongodb://localhost/node_nww');
  });
}

mongoose.connect(app.get('dbPath'), function onMongooseError(err) {
  if (err) throw err;
});

var postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  author: { type: String, required: true }
});

var Post = mongoose.model('Post', postSchema);

app.use(function(req, res, next) {
  var fragment = req.query._escaped_fragment_;
  if (!fragment) return next();

  var url = 'http://localhost:' + app.get('port') + '#'
              + req.query._escaped_fragment_;

  getCachedPage(url, function(success, content){
    // Seite im Cache
    if (success) {
      res.send(content);
    } else {
      console.log('Phantom')
      getPageWithPhantom(url, function(html) {
        // TODO: In Redis ablegen?
        setCachedPage(url, html);
        res.send(html);
      });
    }
  });
});

app.get('/api/posts', function(req, res){
  Post.find({}, function(err, posts){
    if (err) throw err;

    res.json({ posts: posts });
  });
});


app.post('/api/posts', function(req, res){
  var postParams = req.body.post;
  var post = new Post({author: postParams.author,
                       title: postParams.title,
                       body: postParams.body});
  post.save(function(err){
    if (err) throw err;
    res.json(201, {post: post});
  });
});

app.get('/api/posts/:id', function(req, res){
  var id = mongoose.Types.ObjectId(req.params.id);

  Post.findById(id , function(err, post){
    if (err) throw err;

    if (post) {
      res.json({ post: post });
    } else {
      res.statusCode = 404;
    }
  });
});

app.put('/api/posts/:id', function(req, res){
  var id = mongoose.Types.ObjectId(req.params.id);
  var fields = req.body.post;

  Post.findByIdAndUpdate(id, { $set: fields }, function(err, post){
    if (err) throw err;
    if (post) res.send(204);
    else res.send(404);
  });
});

app.delete('/api/posts/:id', function(req, res){
  var id = mongoose.Types.ObjectId(req.params.id);

  Post.findByIdAndRemove(id , function(err, post){
    if (err) throw err;
    if (post) res.send(204);
    else res.send(404);
  });
});

// TODO: Error-Handling
var getPageWithPhantom = function(url, callback) {
  var start = new Date().getTime();

  return phantomProcess.createPage(function(page){
    var elapsed = new Date().getTime() - start;
    console.log('createPage: ' + elapsed);

    page.open(url, function(status){
      var elapsed = new Date().getTime() - start;
      console.log('open: ' + elapsed);

      page.evaluate((function(){
        return document.getElementsByTagName('html')[0].innerHTML;
      }), function(result){
        callback(result);
        // TODO:
        // return ph.exit();
      });
    });
  });
}

var getCachedPage = function(url, callback) {
  client.get(url, function(err, reply){
    if (err) throw err;
    if (!reply) {
      callback(false, null);
      // Seite nicht im Cache
    } else {
      client.get(url, function(err, reply){
        if (err) throw err;
        callback(true, reply);
      });
    }
  });
}

var setCachedPage = function(url, content) {
  // TODO:
  client.setex(url, 10*60, content, function(err, reply){
    if (err) throw err;
    console.log('REDIS: '+reply);
  });
}

app.get('/', function(req, res){
  res.render('index');
});


app.listen(app.get('port'));
