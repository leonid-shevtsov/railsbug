FBL.ns(function() { with (FBL) {

  var panelName = "RailsBug";

  function debug(string, object) {
    FBTrace.sysout(">>> RailsBug >> " + string, object);
  }

  function HeaderInjectingObserver() {}

  HeaderInjectingObserver.prototype = {
    //// PUBLIC

    // HTTP event handler method
    observe: function(subject, topic, data) {
      if (topic == 'http-on-modify-request') {
        this._injectHeaders(subject);
      }
/*
      } else if (topic == 'http-on-examine-response') {
        debug('handling response');
        this._handleResponse(subject);
      }
*/
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
    }
  };

  Firebug.RailsSqlTab = extend(Firebug.Module, {
    initialize: function() {
      Firebug.Module.initialize.apply(this, arguments);

      Firebug.NetMonitor.NetInfoBody.addListener(this);
      Firebug.NetMonitor.addListener(this);
    },

    shutdown: function() {
      Firebug.Module.shutdown.apply(this, arguments);

      Firebug.NetMonitor.NetInfoBody.removeListener(this);
      Firebug.NetMonitor.removeListener(this);
    },
    
    onExamineResponse: function(context, request) {
      var i = -1;
      for(i in context.netProgress.requests) {
        if (request === context.netProgress.requests[i]) {
          break;
        }
      }
      if (i != -1) {
        if (context.railsBugData === undefined)
          context.railsBugData = [];
        if (context.railsBugData[i] === undefined)
          context.railsBugData[i] = this._parseData(this._extractHeaders(request));
      }
    },

    initTabBody: function(infoBox, file) {
      var i = -1;
      for (i in FirebugContext.netProgress.requests) {
        if (file.request === FirebugContext.netProgress.requests[i]) {
          break;
        }
      }

      infoBox.railsBugData = FirebugContext.railsBugData[i];
      if (infoBox.railsBugData) {
        for (var tab in infoBox.railsBugData) {
          Firebug.NetMonitor.NetInfoBody.appendTab(infoBox, 'Railsbug_'+tab, 'Rails '+tab);
        }
      }
    },

    destroyTabBody: function(infoBox, file) {
    },

    updateTabBody: function(infoBox, file, context) {
      // Get currently selected tab.
      var tab = infoBox.selectedTab;
      
      if (tab.dataPresented || infoBox.railsBugData===null) return;
      
      // Detect if it's our tab
      for (var tab_title in infoBox.railsBugData) {
        if (hasClass(tab, 'netInfoRailsbug_'+tab_title+'Tab')) {
          // Make sure the content is generated just once.
          tab.dataPresented = true;

          // Get body element associated with the tab.
          var tabBody = getElementByClass(infoBox, 'netInfoRailsbug_'+tab_title+'Text');

          tabBody.innerHTML = infoBox.railsBugData[tab_title];
          return;
        }
      }
    },

    // Extract RailsBug data from headers
    _extractHeaders: function(subject) {
      var rails_bug_data = '';
      var i = 1;

      try {
        while(true) {
          rails_bug_data += subject.getResponseHeader('X-RailsBug-'+i);
          subject.setResponseHeader('X-RailsBug-'+i, '', false);
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
  });

  // Main module
  Firebug.RailsBugModule = extend(Firebug.ActivableModule, {
    requestObserver: null,

    initialize: function() {
      Firebug.ActivableModule.initialize.apply(this, arguments);

      this.requestObserver = new HeaderInjectingObserver();
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
  Firebug.registerActivableModule(Firebug.RailsSqlTab);
  Firebug.registerPanel(RailsBugPanel); 
}});
