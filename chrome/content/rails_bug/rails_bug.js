FBL.ns(function() { with (FBL) {

  var panelName = "RailsBug";

  Firebug.RailsBugModule = extend(Firebug.Module, {

    initialize: function() {
      Firebug.Module.initialize.apply(this, arguments);

      httpRequestObserver.addObserver(this, 'firebug-http-event', false);
    },

    shutdown: function() {
      Firebug.Module.shutdown.apply(this, arguments);

      httpRequestObserver.removeObserver(this, 'firebug-http-event');
    },

    onMyButton: function(context) {
    },

    observe: function(subject, topic, data) {
      if (topic == 'http-on-modify-request') {
        var httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
        httpChannel.setRequestHeader('X-RailsBug-Enabled', 'true', false);
      } else if (topic == 'http-on-examine-response') {
        FBTrace.sysout('data ex', subject.getResponseHeader('X-RailsBug'));
      }
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
