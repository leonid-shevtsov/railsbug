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

  Firebug.RailsNetTabs = extend(Firebug.Module, {
    // Add listeners
    initialize: function() {
      Firebug.Module.initialize.apply(this, arguments);

      Firebug.NetMonitor.NetInfoBody.addListener(this);
      Firebug.NetMonitor.addListener(this);
    },

    // Remove listeners
    shutdown: function() {
      Firebug.Module.shutdown.apply(this, arguments);

      Firebug.NetMonitor.NetInfoBody.removeListener(this);
      Firebug.NetMonitor.removeListener(this);
    },
    
    // Get headers and extract RailsBug data from them
    onExamineResponse: function(context, request) {
      this._setDataForRequest(context, request, this._parseData(this._extractHeaders(request)));
    },

    // Create tabs according to what's been given in the RailsBug data
    initTabBody: function(infoBox, file) {
      infoBox.railsBugData = this._getDataForRequest(FirebugContext, file.request);

      if (infoBox.railsBugData) {
        for (var tab in infoBox.railsBugData) {
          Firebug.NetMonitor.NetInfoBody.appendTab(infoBox, 'Railsbug_'+tab, 'Rails '+tab);
        }
      }
    },

    // Populate a selected tab
    updateTabBody: function(infoBox, file, context) {
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

    // Extract RailsBug data from headers, clearing them so they won't pollute the Headers tab
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
    },

    // Find the request index in the given context's array of requests
    _getRequestIndex: function(context, request) {
      var i = -1;
      for (i in context.netProgress.requests) {
        if (request === context.netProgress.requests[i]) {
          break;
        }
      }
      return i;
    },

    // Get RailsBug data for given request
    _getDataForRequest: function(context, request) {
      return context.railsBugData ? context.railsBugData[this._getRequestIndex(context, request)] : null;
    },
    
    // Set RailsBug data for given request
    _setDataForRequest: function(context, request, data) {
      var index = this._getRequestIndex(context, request);
      if (!context.railsBugData) {
        context.railsBugData = [];
      }
      if (!context.railsBugData[index]) {
        context.railsBugData[index] = data;
      }
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
  Firebug.registerActivableModule(Firebug.RailsNetTabs);
  Firebug.registerPanel(RailsBugPanel); 
}});
