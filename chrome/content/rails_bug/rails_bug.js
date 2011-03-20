FBL.ns(function() { with (FBL) {

  // Simple JavaScript Templating
  // John Resig - http://ejohn.org/ - MIT Licensed
  (function(){
    var cache = {};
  
    this.tmpl = function tmpl(str, data){
      // Figure out if we're getting a template, or if we need to
      // load the template - and be sure to cache the result.
      var fn = !(/\W/).test(str) ?
        cache[str] = cache[str] ||
          tmpl(document.getElementById(str).innerHTML) :
      
        // Generate a reusable function that will serve as a template
        // generator (and which will be cached).
        new Function("obj",
          "var p=[],print=function(){p.push.apply(p,arguments);};" +
        
          // Introduce the data as local variables using with(){}
          "with(obj){p.push('" +
        
          // Convert the template into pure JavaScript
          str.replace(/[\r\t\n]/g, " ").split("<%").join("\t").replace(/((^|%>)[^\t]*)'/g, "$1\r").replace(/\t=(.*?)%>/g, "',$1,'").split("\t").join("');").split("%>").join("p.push('").split("\r").join("\\'")+ "');}return p.join('');");
    
      // Provide some basic currying to the user
      return data ? fn( data ) : fn;
    };
  })();


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
        for (var i in infoBox.railsBugData) {
          Firebug.NetMonitor.NetInfoBody.appendTab(infoBox, 'Railsbug_'+infoBox.railsBugData[i][0], infoBox.railsBugData[i][1].title);
        }
      }
    },

    // Populate a selected tab
    updateTabBody: function(infoBox, file, context) {
      var tab = infoBox.selectedTab;
      
      if (tab.dataPresented || infoBox.railsBugData===null) return;
      
      // Detect if it's our tab
      for (var i in infoBox.railsBugData) {
        var tab_title = infoBox.railsBugData[i][0];
        var tab_data = infoBox.railsBugData[i][1];

        if (hasClass(tab, 'netInfoRailsbug_'+tab_title+'Tab')) {
          // Make sure the content is generated just once.
          tab.dataPresented = true;

          // Get body element associated with the tab.
          var tabBody = getElementByClass(infoBox, 'netInfoRailsbug_'+tab_title+'Text');
          
          if (this['_render_'+tab_title]) {
            this['_render_'+tab_title](tabBody, tab_data, context);
          } else if (this['_template_'+tab_title]) {
            tabBody.innerHTML = tmpl(this['_template_'+tab_title], tab_data);
          } else {
            Firebug.JSONViewerModel.Preview.render(tabBody, {jsonObject: tab_data}, context);
          }

          return;
        }
      }
    },
  
    formatMs: function(ms) {
      return ''+ms.toFixed(1)+'ms';
    },


    _template_log: ' \
      <% for(var i in entries) { %> \
        <div class="logRow <%={INFO: "logRow-info", DEBUG: "logRow-info", WARN: "logRow-warn", ERROR: "logRow-error", FATAL: "logRow-error"}[entries[i].level]%>"> \
          <span class="objectBox objectBox-text"><span><%= entries[i].message %></span></span> \
        </div> \
      <% } %> \
    ',

    _template_sql: ' \
      <table class="sql-queries"> \
      <% for(var i in queries) { %> \
        <tr> \
          <td class="sql-time"> \
            <%=queries[i].time%> \
          </td> \
          <td class="sql-text"> \
            <%=queries[i].sql %> \
          </td> \
          <td class="sql-actions"> \
            <a href="#copy" title="Copy"><img src="chrome://railsbug/skin/sql-copy.png"></a> \
            <a href="#backtrace" title="Toggle backtrace"><img src="chrome://railsbug/skin/sql-backtrace.png"></a> \
            <a href="#run" title="Execute"><img src="chrome://railsbug/skin/sql-run.png"></a> \
            <a href="#explain" title="EXPLAIN"><img src="chrome://railsbug/skin/sql-explain.png"></a> \
            <a href="#profile" title="Profile"><img src="chrome://railsbug/skin/sql-profile.png"></a> \
          </td> \
        </tr> \
      <% } %> \
      </table> \
    ',

    _template_request_variables: ' \
      <% for (var i in sections) { %> \
        <h2><%= i %></h2> \
        <table class="railsBug-requestVariables-table"> \
          <% for (var j in sections[i]) { %> \
            <tr> \
              <td class="railsBug-requestVariables-table-name"> \
                <%= sections[i][j][0] %> \
              </td> \
              <td class="railsBug-requestVariables-table-value"> \
                <%= JSON.stringify(sections[i][j][1]) %> \
              </td> \
            </tr> \
          <% } %> \
        </table> \
      <% } %> \
    ',

    _template_templates: ' \
      <ul class="railsBug-templates"> \
        <% for (var i in templates) { %> \
          <li> \
            <h3><%=Firebug.RailsNetTabs.formatMs(templates[i].time)%> / <%=Firebug.RailsNetTabs.formatMs(templates[i].exclusive_time)%> ex / <%=templates[i].totalShare%> t / <%=templates[i].parentShare%> p: <%=templates[i].name%></h3> \
            <%=templates[i].children ? tmpl(Firebug.RailsNetTabs._template_templates, {templates: templates[i].children}) : ""%> \
          </li> \
        <% } %> \
      </ul> \
    ',

    _calculateTemplateShares: function(templates, totalTime, parentTime) {
      for (var i in templates) {
        templates[i].totalShare = ''+(templates[i].time*100/totalTime).toFixed(1)+'%';
        templates[i].parentShare = ''+(templates[i].time*100/parentTime).toFixed(1)+'%';
        if (templates[i].children) {
          this._calculateTemplateShares(templates[i].children, totalTime, templates[i].time);
        }
      }
    },

    _render_templates: function(tabBody, data, context) {
      var total_time = 0;

      for (var i in data.templates) {
        total_time += data.templates[i].time;
      }

      this._calculateTemplateShares(data.templates, total_time, total_time);
      
      tabBody.innerHTML = tmpl(this._template_templates, data);
    },

//    _render_request_variables: function(tabBody, data, context) {
//      tabBody.innerHTML = tmpl(this._template_request_variables, data);
//      for (var i in data.sections) {
//        Firebug.JSONViewerModel.Preview.render(tabBody.ownerDocument.getElementById("request_variables_"+i.replace(' ','')+"_container"), {jsonObject: data.sections[i]}, context);
//      }
//    },

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
