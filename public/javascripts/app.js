App = Ember.Application.create({
  LOG_TRANSITIONS: true
});

App.Store = DS.Store.extend({
  revision: 15,
  adapter: DS.RESTAdapter.create()
});

App.Router.map(function() {
  this.route('test');
  this.route('about');
  this.resource('posts', function(){
    this.route('new');
    this.resource('post', { path: ':post_id' }, function(){
      this.route('edit');
    }
)
  }
)
});

App.Post = DS.Model.extend({
  title: DS.attr('string'),
  body: DS.attr('string'),
  author: DS.attr('string'),

  // didCreate: function(){
  //   console.log('Post created');
  // },
  // didUpdate: function(){
  //   console.log('Post updated');
  // },
  // slug: function() {
  //   var shortTitle;
  //   shortTitle = this.get('title').substring(0, 15);
  //   return "" + (this.get('id')) + "-" + shortTitle;
  // }.property('id', 'title'),

  // authorGravatar: function() {
  //   var email;
  //   email = this.get('author') ? this.get('author') : '';
  //   return "http://www.gravatar.com/avatar/" + (MD5(email));
  // }.property('author')

});

App.PostsRoute = Ember.Route.extend({
  model: function() {
    App.Post.find()
  }
});

App.IndexRoute = Ember.Route.extend({
  redirect: function(){
    this.transitionTo('posts');
  }
});

App.PostRoute = Ember.Route.extend({
  model: function(params){
    App.Post.find(params.post_id);
  },

  setupController: function(controller, post){
    controller.set('content', post);
    this.controllerFor('posts').set('activePostID', post.get('id'));
  }
});
