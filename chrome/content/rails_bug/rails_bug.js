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

  function md5hash(str) {
    var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    var result = {};
    var data = converter.convertToByteArray(str, result);
    var ch = Cc["@mozilla.org/security/hash;1"].createInstance(Ci.nsICryptoHash);
    ch.init(ch.MD5);
    ch.update(data, data.length);
    var hash = ch.finish(false);

    // return the two-digit hexadecimal code for a byte
    function toHexString(charCode)
    {
      return ("0" + charCode.toString(16)).slice(-2);
    }

    var s = '';

    for (var i=0, l=hash.length; i<l; i++) {
      s+= toHexString(hash.charCodeAt(i));
    }

    return s;
  }

  var panelName = "RailsBug";

  function debug(string, object) {
    FBTrace.sysout(">>> RailsBug >> " + string, object);
  }

  Firebug.RailsNetTabs = extend(Firebug.Module, {
    // Add listeners
    initialize: function() {
      Firebug.Module.initialize.apply(this, arguments);

      Firebug.NetMonitor.NetInfoBody.addListener(this);
      Firebug.NetMonitor.addListener(this);

      httpRequestObserver.addObserver(this, 'firebug-http-event', false);
    },

    // Remove listeners
    shutdown: function() {
      Firebug.Module.shutdown.apply(this, arguments);

      Firebug.NetMonitor.NetInfoBody.removeListener(this);
      Firebug.NetMonitor.removeListener(this);
      httpRequestObserver.removeObserver(this, 'firebug-http-event');
    },
    
    // observer to inject headers
    observe: function(subject, topic, data) {
      if (topic == 'http-on-modify-request') {
        this._injectHeaders(subject);
      }
    },
    
    // Get headers and extract RailsBug data from them
    onExamineResponse: function(context, request) {
      if (this._requestDataAlreadyStored(request)) {
        return;
      }

      var data_string = this._extractHeaders(request);
      var data_hash = data_string==='' ? '(no railsbug data)' : md5hash(data_string);

      this._setDataForRequest(context, request, data_hash, this._parseData(data_string));
    },

    // Create tabs according to what's been given in the RailsBug data
    initTabBody: function(infoBox, file) {
      infoBox.railsBugData = this._getDataForRequest(FirebugContext, file.request);

      if (infoBox.railsBugData) {
        this._injectStylesheet(infoBox.ownerDocument);

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
          tab.dataPresented = true;
          this.renderTab(infoBox, tab_title, tab_data, context);
          return;
        }
      }
    },

    renderTab: function(infoBox, tabTitle, tabData, context) {
      var tabBody = getElementByClass(infoBox, 'netInfoRailsbug_'+tabTitle+'Text');

      if (this['_render_'+tabTitle]) {
        this['_render_'+tabTitle](tabBody, tabData, context);
      } else if (this['_template_'+tabTitle]) {
        tabBody.innerHTML = tmpl(this['_template_'+tabTitle], tabData);
      } else {
        Firebug.JSONViewerModel.Preview.render(tabBody, {jsonObject: tabData}, context);
      }
    },
  
    formatMs: function(ms) {
      return ''+ms.toFixed(1)+'ms';
    },

    _nextUniqId: 0,

    uniqId: function() {
      this._nextUniqId++;
      return this._nextUniqId;
    },

    _template_log: ' \
      <% for(var i in entries) { %> \
        <div class="logRow <%={INFO: "logRow-info", DEBUG: "logRow-info", WARN: "logRow-warn", ERROR: "logRow-error", FATAL: "logRow-error"}[entries[i].level]%>"> \
          <span class="objectBox objectBox-text"><span><%= entries[i].message %></span></span> \
        </div> \
      <% } %> \
    ',

    _template_sql: ' \
      <table class="railsBug-sql-queries" cellspacing="0" cellpadding="0"> \
      <% for(var i=0, l=queries.length; i<l; i++) { if(!queries[i].uniqid) {queries[i].uniqid = Firebug.RailsNetTabs.uniqId();}  %> \
        <tr class="railsBug-sql-entry"> \
          <td class="railsBug-sql-time"> \
            <div class="railsBug-sql-time-container"> \
              <%=queries[i].time%> \
              <div class="railsBug-sql-actions"> \
                <a id="railsBug-sql-copyLink-<%= queries[i].uniqid %>" href="#copy" title="Copy"><img src="chrome://railsbug/skin/sql-copy.png"></a> \
                <a id="railsBug-sql-backtraceLink-<%= queries[i].uniqid %>" href="#backtrace" title="Toggle backtrace"><img src="chrome://railsbug/skin/sql-backtrace.png"></a> \
                <!-- \
                <a href="#run" title="Execute"><img src="chrome://railsbug/skin/sql-run.png"></a> \
                <a href="#explain" title="EXPLAIN"><img src="chrome://railsbug/skin/sql-explain.png"></a> \
                <a href="#profile" title="Profile"><img src="chrome://railsbug/skin/sql-profile.png"></a> \
                --> \
              </div> \
            </div> \
          </td> \
          <td class="railsBug-sql-text"> \
            <%=queries[i].sql %> \
            <div class="railsBug-sql-backtrace" id="railsBug-sql-backtrace-<%=queries[i].uniqid%>"> \
              <% for (var j=0, k=queries[i].backtrace.length; j<k; j++) { %> \
                <div><%= queries[i].backtrace[j] %></div> \
              <% } %> \
            </div> \
          </td> \
        </tr> \
      <% } %> \
      </table> \
    ',

    _render_sql: function(tabBody, data, context) {
      tabBody.innerHTML = tmpl(this._template_sql, data);

      for (var i=0, l=data.queries.length; i<l; i++) {
        tabBody.ownerDocument.getElementById('railsBug-sql-copyLink-'+data.queries[i].uniqid).onclick = (function(sql) {
          return function() {
            Firebug.RailsNetTabs._copyToClipboard(sql);
          };
        })(data.queries[i].sql);
        
        tabBody.ownerDocument.getElementById('railsBug-sql-backtraceLink-'+data.queries[i].uniqid).onclick = (function(uniqid) {
          return function() {
            var backtrace = tabBody.ownerDocument.getElementById('railsBug-sql-backtrace-'+uniqid);
            if (hasClass(backtrace, 'visible')) {
              removeClass(backtrace, 'visible');
            } else {
              setClass(backtrace, 'visible');
            }
          };
        })(data.queries[i].uniqid);
      }
    },

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
            <%=Firebug.RailsNetTabs.formatMs(templates[i].time*1000)%> / \
            <%=Firebug.RailsNetTabs.formatMs(templates[i].exclusive_time*1000)%> ex / \
            <%=templates[i].totalShare%> t / \
            <%=templates[i].parentShare%> p: \
            <strong><%=templates[i].name%></strong> \
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
//
    // Add RailsBug headers to the request
    _injectHeaders: function(subject) {
      var httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
      httpChannel.setRequestHeader('X-RailsBug-Enabled', 'true', false);
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

    // Get RailsBug data for given request
    _getDataForRequest: function(context, request) {
      return context.railsBugData ? context.railsBugData[request.getResponseHeader('X-RailsBug-Key')] : null;
    },
      
    _requestDataAlreadyStored: function(request) {
      try {
        request.getResponseHeader('X-RailsBug-Key');
        return true;
      } catch(NS_ERROR_NOT_AVAILABLE) {
        // no header! so we need to set it
        return false;
      }
    },
    
    // Set RailsBug data for given request
    _setDataForRequest: function(context, request, data_hash, data) {
      try {
        request.setResponseHeader('X-RailsBug-Key', data_hash, false);
      } catch(NS_ERROR_NOT_AVAILABLE) {
        // seems like this is OK
      }

      if (!context.railsBugData) {
        context.railsBugData = [];
      }

      if (!context.railsBugData[data_hash]) {
        context.railsBugData[data_hash] = data;
      }
    },

    _injectStylesheet: function(doc)
    {
      if ($("railsBugStyles", doc))
          return;

      var stylesheet = createStyleSheet(doc, "chrome://railsbug/skin/railsbug.css");

      stylesheet.setAttribute("id", "railsBugStyles");
      addStyleSheet(doc, stylesheet);
    },

    _copyToClipboard: function(text)
    {
      var xfer = Cc["@mozilla.org/widget/transferable;1"].createInstance(Ci.nsITransferable);
      xfer.addDataFlavor("text/unicode");

      var xferString = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
      xferString.data = text;
      xfer.setTransferData("text/unicode", xferString, text.length * 2);

      var clipboard = Cc["@mozilla.org/widget/clipboard;1"].getService(Ci.nsIClipboard);
      clipboard.setData(xfer, null, Ci.nsIClipboard.kGlobalClipboard);
    }
  });

  Firebug.registerModule(Firebug.RailsNetTabs);
}});
