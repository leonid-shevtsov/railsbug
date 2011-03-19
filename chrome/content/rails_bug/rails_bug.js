FBL.ns(function() { with (FBL) {

  var panelName = "RailsBug";

  function debug(string, object) {
    FBTrace.sysout(">>> RailsBug >> " + string, object);
  }

  // Observer object to handle HTTP requests
  function RailsBugObserver() {}

  RailsBugObserver.prototype = {
    //// PUBLIC

    // HTTP event handler method
    observe: function(subject, topic, data) {
        debug('observer');
      if (topic == 'http-on-modify-request') {
        this._injectHeaders(subject);
      } else if (topic == 'http-on-examine-response') {
        debug('handling response');
        this._handleResponse(subject);
      }
    },

    // Set observer to process HTTP events
    bind: function() {
      if (!this._isBound) {
        httpRequestObserver.addObserver(this, 'firebug-http-event', false);
        this._isBound = true;
      }
    },

    // Stop processing HTTP events
    unbind: function() {
      if (this._isBound) {
        httpRequestObserver.removeObserver(this, 'firebug-http-event');
        this._isBound = false;
      }
    },
    
    //// PRIVATE
    
    _isBound: false,
    
    // Add RailsBug headers to the request
    _injectHeaders: function(subject) {
      var httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
      httpChannel.setRequestHeader('X-RailsBug-Enabled', 'true', false);
    },
    
    // Handle RailsBug data from the response
    _handleResponse: function(subject) {
      debug('handleResponse');
      var rails_bug_data = this._parseData(this._extractHeaders(subject));
      if (rails_bug_data !== null) {
        Firebug.RailsBugModule.handle(rails_bug_data);
      }
    },

    // Extract RailsBug data from headers
    _extractHeaders: function(subject) {
      var rails_bug_data = '';
      var i = 1;

      try {
        while(true) {
          rails_bug_data += subject.getResponseHeader('X-RailsBug-'+i);
          i++;
        }
      } catch(NS_ERROR_NOT_AVAILABLE) {
        // this acts like a break from the loop
      }

      return rails_bug_data;
    },

    // Parse incoming RailsBug data.
    // TODO error handling
    _parseData: function(data) {
      return data==='' ? null : JSON.parse(data);
    }
  };

  // Main module
  Firebug.RailsBugModule = extend(Firebug.ActivableModule, {
    requestObserver: null,

    initialize: function() {
      Firebug.ActivableModule.initialize.apply(this, arguments);

      this.requestObserver = new RailsBugObserver();
    },

    shutdown: function() {
      Firebug.ActivableModule.initialize.apply(this, arguments);

      this.requestObserver.unbind();
      delete this.requestObserver;
    },

    onObserverChange: function(observer) {
      if (this.hasObservers()) {
        this.requestObserver.bind();
      } else {
        this.requestObserver.unbind();
      }
    },

    onMyButton: function(context) {
      alert('!');
    },

    handle: function(context, data) {
      FBTrace.sysout('in handler');
      var panel = FirebugContext.getPanel(panelName);
      panel.panelNode.innerHTML = panel.panelNode.innerHTML + 'FFFFUUUU';
    }
  });

  function RailsBugPanel() {}

  RailsBugPanel.prototype = extend(Firebug.ActivablePanel, {
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
    },

    onActivationChanged: function(enable)
    {
      if (enable) {
        Firebug.RailsBugModule.addObserver(this);
      } else {
        Firebug.RailsBugModule.removeObserver(this);
      }
    }
  });

  Firebug.registerActivableModule(Firebug.RailsBugModule);
  Firebug.registerPanel(RailsBugPanel); 

}});
