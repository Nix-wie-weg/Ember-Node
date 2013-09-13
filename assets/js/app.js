//= require 'extensions'

App = Ember.Application.create({
  LOG_TRANSITIONS: true
});

App.ApplicationAdapter = DS.RESTAdapter.extend({
  url: 'http://localhost:3000',
  namespace: 'api'
});

App.Store = DS.Store.extend({
  revision: 15,
  adapter: 'App.ApplicationAdapter'
});

App.Router.reopen({
  // location: 'history'
});

App.Router.map(function() {
  this.route('test');
  this.route('about');
  this.resource('posts', function(){
    this.route('new');
    this.resource('post', { path: ':post_id' }, function(){
      this.route('edit');
    })
  })
});

App.Post = DS.Model.extend({
  title: DS.attr('string'),
  body: DS.attr('string'),
  author: DS.attr('string'),

  didCreate: function(){
    console.log('Post created');
  },
  didUpdate: function(){
    console.log('Post updated');
  },
  slug: function() {
    // var shortTitle;
    var title = this.get('title');
    if (title == undefined)
      shortTitle = '';
    else
      shortTitle = this.get('title').substring(0, 15);
    return shortTitle;
  }.property('id', 'title'),

  authorGravatar: function() {
    var email;
    email = this.get('author') ? this.get('author') : '';
    return "http://www.gravatar.com/avatar/" + (MD5(email));
  }.property('author')

});

// https://github.com/emberjs/data/blob/master/TRANSITION.md
App.PostSerializer = DS.RESTSerializer.extend({
  // This method will be called 3 times: once for the post, and once
  // for each of the comments
  normalize: function(type, hash, property) {
    // property will be "post" for the post and "comments" for the
    // comments (the name in the payload)

    // normalize the `_id`
    var json = { id: hash._id };
    delete hash._id;

    // normalize the underscored properties
    for (var prop in hash) {
      json[prop.camelize()] = hash[prop];
    }

    // delegate to any type-specific normalizations
    return this._super(type, json, property);
  }
});

App.IndexRoute = Ember.Route.extend({
  setupController: function(controller){
    controller.set('title', 'Demo App build around Express and Ember');
  }
});

App.AboutRoute = Ember.Route.extend({
  setupController: function(controller){
    controller.set('title', 'About');
  }
});

// TODO: Spinner
App.LoadingRoute = Ember.Route.extend({});

App.PostsRoute = Ember.Route.extend({
  model: function() {
    var store = this.get('store');

    // Posts in den Store laden
    store.find('post');
    // Nur bereits gespeicherte Posts in der Liste anzeigen
    return store.filter('post', function(post){
      return !post.get('isNew');
    });
  }
});

App.PostRoute = Ember.Route.extend({
  model: function(params){
    return this.store.find('post', params.post_id);
  },

  setupController: function(controller, post){
    controller.set('content', post);
    this.controllerFor('posts').set('activePostID', post.get('id'));
  }
});

App.PostsNewRoute = Ember.Route.extend({
  model: function() {
    return this.store.createRecord('post');
  },

  setupController: function(controller, post) {
    controller.set('content', post);
  }
});

App.PostEditRoute = Ember.Route.extend({
  model: function() {
    return this.modelFor('post');
  },
  setupController: function(controller, model){
    controller.set('content', model);
  }
});

App.PostsController = Ember.ArrayController.extend({
  postCount: function() {
    return this.get('model').get('length')
  }.property('model.length'),
});

App.PostController = Ember.ObjectController.extend({
  actions: {
    destroy: function(){
      if (window.confirm("Are you sure?")) {
        var post = this.get('content');
        post.deleteRecord();

        var self = this;
        post.save().then(
          function(){
            self.transitionToRoute('posts.index');
          },

          function(error){
            post.rollback();
            console.log('error deleting');
          }
        );
      }
    }
  }
});

App.PostEditController = Ember.ObjectController.extend({
  actions: {
    update: function(){
      post = this.get('content');

      var self = this;
      post.save().then(function(){
        self.transitionToRoute('post', post);
      });
    },

    cancel: function(){
      this.transitionToRoute('post', this.get('content'));
    }
  }
});

App.PostsNewController = Ember.ObjectController.extend({
  actions: {
    save: function() {
      post = this.get('content');

      // Gay...
      var self = this;
      post.save().then(
        function() {
          self.transitionToRoute('post', post);
        },
        function(error) {
          console.log("error", error);
        }
      );
    },

    cancel: function(){
      this.get('content').rollback()
      this.transitionToRoute('posts.index');
    }
  }
});
