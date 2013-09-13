markdown = new Markdown.Converter();

Ember.Handlebars.helper('markdown', function(content){
  return new Handlebars.SafeString(markdown.makeHtml(content))
});

Ember.TextSupport.reopen({
  attributeBindings: ['required', 'autofocus']
});
