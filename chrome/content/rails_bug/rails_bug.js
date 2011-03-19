FBL.ns(function() { with (FBL) {

  var panelName = "RailsBug";

  function RailsBugObserver(context) {
    this.context = context;
  }

  RailsBugObserver.prototype = {
    observe: function(subject, topic, data) {
      if (Firebug.RailsBugModule.activeContext == this.context) {
        if (topic == 'http-on-modify-request') {
          var httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
          httpChannel.setRequestHeader('X-RailsBug-Enabled', 'true', false);
        } else if (topic == 'http-on-examine-response') {
          try { 
            var rails_bug_data = JSON.parse(subject.getResponseHeader('X-RailsBug'));
            Firebug.RailsBugModule.handle(context, rails_bug_data);
          } catch(NS_ERROR_NOT_AVAILABLE) {
            // no RailsBug header present
          }
        }
      }
    },
      
    bind: function() {
      httpRequestObserver.addObserver(this, 'firebug-http-event', false);
    },

    unbind: function() {
      httpRequestObserver.removeObserver(this, 'firebug-http-event');
    }
  };

  Firebug.RailsBugModule = extend(Firebug.Module, {
    activeBrowser: null,
    activeContext: null,

    showContext: function(browser, context) {
      this.activeBrowser = browser;
      this.activeContext = context;
    },
    
    initContext: function(context, persisted) {
      context.railsBugObserver = new RailsBugObserver(context);
      context.railsBugObserver.bind();
    },
  
    destroyContext: function(context, persisted) {
      context.railsBugObserver.unbind();
      delete context.railsBugObserver;
    },

    onMyButton: function(context) {
    },

    handle: function(context, data) {
      FBTrace.sysout('data', data);
    }
  });

  function RailsBugPanel() {}

  RailsBugPanel.prototype = extend(Firebug.Panel, {
    name: panelName,
    title: "Ruby on Rails",

    initialize: function() {
        Firebug.Panel.initialize.apply(this, arguments);
    },

    show: function() {
      this.showToolbarButtons("fbRailsBugButtons", true);
    },

    hide: function() {
      this.showToolbarButtons("fbRailsBugButtons", false);
    }
  });

  Firebug.registerModule(Firebug.RailsBugModule);
  Firebug.registerPanel(RailsBugPanel); 

}});
