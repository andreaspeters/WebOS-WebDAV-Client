enyo.kind({
  name: "WebDavClient",  
  kind: enyo.VFlexBox,

  dirListData: [ ],    // Das JSON Data Array für die Datei und Verzeichnisliste

  // Die WebDav Api  
  davReq: new davApi(),
  // Der Aktuell ausgewaehlte Server   
  currentServer: [ ],
  // Das aktuell ausgwaehlte Datei Object   
  currentItem: "",     
  // Das aktuelle Verzeichnis
  currentPath: "/",
  // Das Verzeichnis in dem die ausgewaehlte Datei gespeichert wird
  targetDir: "/media/internal/downloads",
  // Kennung ob die heruntergeladene Datei auch geöffnet werden soll       
  fileOpen: false,
  // Aktuelles Download ticket
  downloadTicket: null,	  
  // Mit Server verbunden
  connected: false,
  // Server konfiguration ändern
  changeServer: false,

  db: null,
  

  
  components: [
		{kind: "ApplicationEvents", onLoad: "initializeWebDavClient"},
    //Haupt Fenster
		{kind: "SlidingPane", multiView: true, flex:1, components: [
			// Fenster Menü
			{kind: "AppMenu", components: [
				{caption: "Donation", onclick: "donateForAventer"},
				{caption: "About", onclick: "openAbout"},
				{caption: "Help", onclick: "openHelp"}
			]},
			// Linker Abschnitt
			{name: "server", width: "250px", components: [
            {kind: "PageHeader", name:"ServerHeader", style:"height:60px;", components: [
         		{kind: enyo.VFlexBox, content: "WebDav Server", flex: 1},
            ]},
            {kind: "Scroller", flex: 1, style: "height:630px", components: [			
					{kind: "VFlexBox", align: "left", components: [
						{name: "serverList", kind: "VirtualRepeater", flex:1, onSetupRow: "renderServerListItem", components: [
							// Server Liste
							{name: "serverItem", kind: "SwipeableItem", layoutKind: "HFlexLayout", onclick: "btnClickConnectServer", onConfirm: "deleteServerListItem", components: [
								{name: "captionServer", flex: 1}
							]}
						]}					
					]}
				]},
				{kind: "Spacer"},			
				{kind: "Toolbar", name: "ServerToolbar", components: [
					{kind: "ToolButton", name: "btnAddServer", icon: "images/add.png", onclick: "btnClickShowAddServerDialog"},
					{kind: "ToolButton", icon: "images/configure.png", onclick: "btnClickOpenServerConfigure" },
				]},				
			]},
			// Rechter Abschnitt
			{name: "Navigator", flex:1, components: [
            {kind: "PageHeader", style:"height:60px;", components: [
         		{kind: enyo.VFlexBox, content: "Navigator", flex: 1},
         		{kind: "Spinner"},
            ]},			
            {name: "dirListScroller", kind: "Scroller", flex: 1, style: "height:630px", components: [
					{kind: "VFlexBox", flex:1, align: "left", components: [					   
						{name: "dirList", kind: "VirtualRepeater", flex:1, onSetupRow: "renderDirListItem", components: [
							{name: "dirItem", kind: "SwipeableItem", style: "height:45px", layoutKind: "HFlexLayout", onclick: "btnClickOpenDirFile", onConfirm: "deleteDirListItem", components: [
								{name: "dirIcon", kind: "Image", style: "height:32px;witdh:32px;"},
								{kind: "VFlexBox", align: "left", components: [
									{name: "captionDir", style: "font-size:13px;font-weight:bold;"},
									{name: "captionMeta", style: "font-size:10px;font-style:italic;padding-top:1px;"}
								]}								
							]}
						]}										
					]}
				]},
				{kind: "Spacer"},
				{kind: "Toolbar", components: [
					{kind: "GrabButton"},
					{kind: "HFlexBox", components: [
						{kind: "ToolButton", icon: "images/back.png", onclick: "btnClickDirListBack" },
						{kind: "ToolButton", icon: "images/refresh.png", onclick: "btnClickRefreshNavigator"},
						{kind: "ToolButton", icon: "images/document-new.png", onclick: "btnClickShowUploadFilePicker"},
						{kind: "ToolButton", icon: "images/folder-new.png", onclick: "btnClickShowNewFolderDialog"}
					]}
				]}
			]}
		]},  
      
      
      // Add Server Dialog
		{name: "addServerDialog", kind: "ModalDialog", onOpen: "addServerDialogOpen", style: "width:400px",  components: [
			{kind: "RowGroup", caption: "Add new WebDAV Server",  components: [
				{kind: "VFlexBox", align: "left", style: "padding: 5px", components: [
					{name: "itemName", kind: "Input", spellcheck:false, autoWordComplete: false, hint: "Display Name"},
					{name: "protocol", kind: "CustomListSelector", style: "padding-left:10px;", onChange: "protocolChanged", value: "https", items: [
						{caption: "HTTP", value: "http"},
						{caption: "HTTPS", value: "https"}
					]},
					{name: "port", kind: "Input", spellcheck:false, autoWordComplete: false, hint: "Port"},
					{name: "servername", kind: "Input", disabled:false, spellcheck:false, autoWordComplete: false, hint: "Server Name"},					
					{name: "username", kind: "Input", spellcheck:false, autoWordComplete: false, hint: "Username"},
					{name: "password", kind: "PasswordInput", spellcheck:false, autoWordComplete: false, hint: "Password"},
					{kind: "Spacer"}
			   ]}
			]},
			{kind: "HFlexBox", align: "middle", components: [
				{kind: "Button", flex: 1, caption: "Save", onclick: "btnClickSaveAddServerDialog"},
				{kind: "Button", flex: 1, caption: "Close", onclick: "btnClickCloseAddServerDialog"}
			]}			
      ]},
      
      
      // Message Dialog fuer jegliche Art von Meldungen
      {name: "infoMessageDialog", kind: "ModalDialog", style: "width:400px", components: [      
      	{kind: "VFlexBox", align: "center", style: "padding: 5px", components: [
      	   {name: "infoMessage", style:"font-weight:bold;font-size:13px;"},
      		{kind: "Button", flex: 1, caption: "OK", onclick: "btnClickCloseInfoMessageDialog"}
      	]}
      ]},

      // Message Dialog fuer Datei aktionen (oeffnen oder downloaden)
      {name: "fileActionDialog", kind: "ModalDialog", style: "width:400px", components: [
      	{kind: "VFlexBox", align: "left", style: "align:right", components: [
				{kind: "RowGroup", caption: "File Action",  components: [
					{kind: "VFlexBox", align: "left", components: [      	
      				{name: "fileName", style:"font-weight:bold;font-size:13px;"},
      				{name: "fileCreationDate", style:"font-size:13px;"},
      				{name: "fileLastModified", style:"font-size:13px;"},
      				{name: "fileContentType", style:"font-size:13px;"}
      			]}
      		]}
      	]},
			{name: "fileDownloadProgressBar", kind: "ProgressBar", minimum:0, maximum:100, position:1},      	
      	{kind: "HFlexBox", align: "right", style: "padding: 5px", components: [      	         		
      	   {kind: "Button", flex: 1, caption: "Open", onclick: "btnClickOpenFile"},
      		{kind: "Button", flex: 1, caption: "Download", onclick: "btnClickDownloadFile"},
      		{kind: "Button", flex: 1, caption: "Cancel", onclick: "btnClickCloseFileActionDialog"}      	
			]}
   		]},
   	
   	
      // Message Dialog fuer das Anlegen eines neuen Verzeichnisses
      {name: "createFolderDialog", kind: "ModalDialog", style: "width:400px", components: [
      	{kind: "VFlexBox", align: "left", style: "align:right", components: [
				{kind: "RowGroup", caption: "Create Folder",  components: [
					{kind: "VFlexBox", align: "left", components: [      	
      				{name: "folderName", kind: "Input", hint: "Folder Name"},
      			]}
      		]}
      	]},
      	{kind: "HFlexBox", align: "right", style: "padding: 5px", components: [      	         		
      	   {kind: "Button", flex: 1, caption: "Create", onclick: "btnClickCreateNewFolder"},
      	   {kind: "Button", flex: 1, caption: "Cancel", onclick: "btnClickCloseCreateFolderDialog"}      	
			]}
   		]},    
   	    

		{name: "uploadFilePicker", kind: "FilePicker", onPickFile: "uploadFilePickerResponse"},


      // Palm Service Calls                                   
      { name: "fileDownloadCall", kind: "PalmService", service: "palm://com.palm.downloadmanager/", method: "download", onSuccess: "downloadFileSuccess", onResponse: "downloadFileResponse", subscribe: true },
      { name: "fileOpenCall", kind: "PalmService", service: "palm://com.palm.applicationManager/", method: "open", onSuccess: "openFileSuccess", onResponse: "downloadFileResponse", subscribe: true }
      //{ name: "fileSendCall", kind: "PalmService", service: "palm://com.aventer.webdavclientlite.service/", method: "sendfile", onSuccess: "sendFileSuccess", onFailure: "sendFileFailure" },
     
      
  ],
    
  // Daten der angelegten Server (Format: JSON)
  serverData: [ ],

  // Programmstart  
  initializeWebDavClient: function(inSender) {  	  		
 		// Konfiguration Laden. Wenn die DB noch nicht existiert, wird diese erstellt
			this.db = openDatabase('WebDavDB','0.1','WebDAV Data Store', 2000);
  		if (this.db) {
  			this.nullHandleCount = 0;  			  			
  			// Tabelle erstellen, sofern diese noch nicht existiert
  			var sqlString = "CREATE TABLE IF NOT EXISTS serverliste (servername TEXT, name TEXT, username TEXT, password TEXT, protocol TEXT, port TEXT);";
  			this.db.transaction(enyo.bind(this,(function(transaction) {	transaction.executeSql(sqlString, [],enyo.bind(this,this.firstInitDBFinish),enyo.bind(this,this.showErrorInInfoMessage));})));
    	}
  },
  
  // Handler fuer das erstmalige anlegen der DB  
  firstInitDBFinish: function(transaction, results) {  	
  			// Serverliste laden
  			sqlString = "select * from serverliste";
  			this.db.transaction(enyo.bind(this,(function (transaction) { transaction.executeSql(sqlString, [], enyo.bind(this,this.loadServerListFromDB),enyo.bind(this,this.showErrorInInfoMessage));})));
  },
  
  // Handler fuer das auswerten der Serverlist Laden query  
  loadServerListFromDB: function(transaction, results) {  	
 		for (var i = 0; i < results.rows.length; i++) {
  			var row = results.rows.item(i);
  			this.serverData.push({servername: row.servername, name: row.name, username: row.username, password: row.password, protocol: row.protocol, port: row.port});
			// Serverliste neuladen
			this.$.serverList.render();
  		}
  },
  
  
  
  /* ********************** CONFIGURE SERVER *************************** */
 
  /*
   * Server konfigurations Mode aktivieren
   */
  btnClickOpenServerConfigure: function() {  	
  	if (!this.changeServer) {
  		this.$.ServerToolbar.setStyle("-webkit-box-pack:center;-webkit-box-align:center;background-color:#3388DD");
  		this.$.ServerHeader.setStyle("height:60px;-webkit-box-pack:start;-webkit-box-align:stretch;background-color:#3388DD");
  		this.changeServer = true;
  		this.$.btnAddServer.disabled = true;  		
  	} else {
  		this.$.ServerToolbar.setStyle("-webkit-box-pack:center;-webkit-box-align:center;background-color:#343434");
  		this.$.ServerHeader.setStyle("height:60px;-webkit-box-pack:start;-webkit-box-align:stretch;background-color:#CCCCCC");  		
  		this.changeServer = false;
  		this.$.btnAddServer.disabled = false;
  	}
  },
  
  
  /* ************************* APP MENU ******************************** */
  openHelp: function() {
  	this.$.fileOpenCall.call({ target: "http://www.aventer.biz/"});
  },
 
  openAbout: function() {
  	this.$.fileOpenCall.call({ target: "http://www.aventer.biz/13-0-WebDAV-Client-HD.html"});
  },
  donateForAventer: function() {
  	this.$.fileOpenCall.call({ target: "https://www.aventer.biz/104-1-donate.html"});
  },
  
 
  /* *********************** Datei Hochladen *************************** */
  
  // Filepicker Dialog anzeigen
  btnClickShowUploadFilePicker: function(inSender, inIndex) {
  		if (this.connected) {
  			this.$.uploadFilePicker.pickFile();
  		}
  },  
  
  // Ausgewaehlte Datei einlesen
  uploadFilePickerResponse: function(inSender, inFile) {	
  		if (inFile  !== 'undefined' ) {
  			var filename = inFile[0].fullPath.split("/");
  			this.$.fileSendCall.call({
  					sourceFile:inFile[0].fullPath,
  					username: this.currentServer.username,
  					password: this.currentServer.password,
  					protocol: this.currentServer.protocol,
  					server: this.currentServer.servername,
  					port: this.currentServer.port,
  					path: encodeURI(this.currentPath+"/"+filename[filename.length-1])
  				});  				
  		}
  },


  // Datei wurde erfolgreich eingelesen und soll nun hochgeladen werden
  sendFileSuccess: function(inSender, inResponse) {
  		this.$.spinner.show();
  		if (inResponse.finish !== 'undefined') {
  			if (inResponse.finish) {
  				this.$.dirList.render();
  			}	
  		}
  },

  // Datei wurde erfolgreich eingelesen und soll nun hochgeladen werden
  sendFileFailure: function(inSender, inResponse) {
  		if (inResponse.error !== 'undefined') {
  			if (inResponse.error) {
  				this.$.spinner.close();  			
				this.showInfoMessage("Error: "+inResponse.errorText);
			}
		}
  },

  /* *************** Neues Verzeichnis Anlegen Dialog ****************** */

	// Neues Verzeichnis anlegen
	btnClickCreateNewFolder: function() {
		// Verzeichnis nur anlegen, wenn ein Name angegeben wurde
		if (this.$.folderName.getValue()) {
			this.$.spinner.show();
			// Verzeichnis erstellen			
			this.davReq.createDir(this.currentPath+"/"+this.$.folderName.getValue(),getCreateFolderRequest);
   	   	
	   		this.$.folderName.setValue("");
   			this.$.dirList.render();
			this.$.createFolderDialog.close();
		}
	},

	// Anzeigen des "neuen Verzeichnis anlegen" Dialoges
   btnClickShowNewFolderDialog: function(inSender, inIndex) {
   		if (this.connected) {
   			this.$.createFolderDialog.openAtCenter();
   		}
   },
  
  	// Schliessen des "neues Verzeichnis anlegen" Dialoges ohne zu speichern 
	btnClickCloseCreateFolderDialog: function(inSender, inIndex) {
		this.$.folderName.setValue("");
		this.$.createFolderDialog.close();
	},
  
   
  /* *************** File Dialog bezogene Aktionen **************** */

  /* File Dialog Oeffnen
     -------------------------------------------------
     
     Uebergabeparameter:
     		item : ist JSON Object im Format {path:, filename:, creationdate:, lastmodified:, contenttype:}
     		
  */
  showFileActionDialog: function(item) {  	
  		// FileAction Dialog oeffnen	
  		this.$.fileActionDialog.openAtCenter();
  		
  		// Progressbar nicht anzeigen
  		this.$.fileDownloadProgressBar.hide();
  		
  		// Die Felder Innerhalb des Dialogs beschreiben
  		this.$.fileName.setContent("Filename: "+item.filename);
  		this.$.fileCreationDate.setContent("Creation Date: "+item.creationdate);
		this.$.fileLastModified.setContent("Last Modified: "+item.lastmodified);
		this.$.fileContentType.setContent("Content Type: "+item.contenttype);  		  		
  },  
  
  // Ausgewaehlte Datei Oeffnen
  btnClickOpenFile: function() {
  		this.$.fileDownloadProgressBar.show();
  		
		// wenn der servername ein verzeichnis mit beinhalltet, dann muss dieser erst einmal entfernt werden.
		var path = "";
		var servername = this.currentServer.servername;
		if (servername.indexOf("/") > 0) {	
			path = servername.slice(servername.indexOf("/"),servername.length);
			servername = servername.slice(0,servername.indexOf("/")); 				
		}     		
  		
  		//enyo.log(this.currentServer.protocol+"://"+encodeURI(this.currentServer.username).replace("@","%40")+":"+encodeURI(this.currentServer.password).replace("@","%40")+"@"+servername+encodeURI(this.currentItem.path));

  		this.$.fileDownloadCall.call({target: this.currentServer.protocol+"://"+encodeURI(this.currentServer.username).replace("@","%40")+":"+encodeURI(this.currentServer.password).replace("@","%40")+"@"+servername+encodeURI(this.currentItem.path), 
  												mime: this.currentItem.contenttype, 
  												targetDir: this.targetDir, 
  												targetFilename: this.currentItem.filename,
  												keepFilenameOnRedirect: false,
  												canHandlePause: true,
  												subscribe: true});

 		this.fileOpen = true;					
  },
  
  // Ausgewahlte Datei downloaden
  btnClickDownloadFile: function() {
  		this.$.fileDownloadProgressBar.show();  	
		
		// wenn der servername ein verzeichnis mit beinhalltet, dann muss dieser erst einmal entfernt werden.
		var path = "";
		var servername = this.currentServer.servername;
		if (servername.indexOf("/") > 0) {	
			path = servername.slice(servername.indexOf("/"),servername.length);
			servername = servername.slice(0,servername.indexOf("/")); 				
		}  		
		
  		this.$.fileDownloadCall.call({target: this.currentServer.protocol+"://"+encodeURI(this.currentServer.username).replace("@","%40")+":"+encodeURI(this.currentServer.password).replace("@","%40")+"@"+servername+encodeURI(this.currentItem.path), 
  												mime: this.currentItem.contenttype, 
  												targetDir: this.targetDir, 
  												targetFilename: this.currentItem.filename,
  												keepFilenameOnRedirect: false,
  												canHandlePause: true,
  												subscribe: true});
  		this.fileOpen = false;  	
  },

  // Anzeigen der Progressbar und setzen der Position  
  downloadFileResponse: function(inSender, inResponse) {	
  		this.$.fileDownloadProgressBar.show();  		
  		
  		// Download Ticketnummer merken, um den download ggfs abzubrechen
  		this.downloadTicket = inResponse.ticket;
		var percent = (100/inResponse.amountTotal)*inResponse.amountReceived;
		
		// Nur die Position aktualisieren, wenn die Prozentzahl groesser 1 ist um ein springen des balkens zu umgehen 
		if ( percent > 1 ) {
  			this.$.fileDownloadProgressBar.setPosition(percent);
  		}  	

		// Download ist beendet
		if (this.$.fileDownloadProgressBar.getPosition() == 100) {
			// Position der Progressbar zuruecksetzen
			this.$.fileDownloadProgressBar.hide();
			this.$.fileDownloadProgressBar.setPosition(1);
			this.$.fileActionDialog.close();						
			
			// Datei oeffnen sofern der User den oeffnen button drueckte
			if (this.fileOpen) {
				this.$.fileOpenCall.call({ target: this.targetDir+"/"+this.currentItem.filename});
				this.fileOpen=false;
			}						
	   }		  			
  },
  
  // FileActionDialog fenster soll ohne weitere Aktion geschlossen werden
  btnClickCloseFileActionDialog: function() {
  		// Wenn gerade am downloaden ist, den download abbrechen
  		if (this.downloadTicket) {
  			this.$.fileOpenCall.call({ticket: this.downloadTicket});
  			this.downloadTicket = null;
  			this.$.fileDownloadProgressBar.setPosition(1);
  		}
  		this.$.fileActionDialog.close();
  },
  
  // Message Ausgabe, wenn beim herunterladen eines Files ein Fehler auftrat
  downloadFileFailure: function (inSender, inResponse) {
  		this.showInfoMessage("Error: "+inResponse.errorText);
  },
  
  // Download konnte erfolgreich gestartet werden
  downloadFileSuccess: function(inSender, inResponse) {
  },
  
  /* *************** WebDav File List bezogene Funktionen ***************** */


  // FileList Eintraege erstellen
  renderDirListItem: function (inSender, inIndex) {
  		
  		var item = this.dirListData[inIndex];	  			
  		if (item)  {
  			
  			// Pruefen ob der aktuelle Eintrag ausgewaehlt wurde
  			var isSelected = (inIndex == this.selectedDirItem);
  			if (isSelected) {
  				// Hintergrundfarbe aendern
  				this.$.dirItem.applyStyle("background-color", "#CCFFFF");
  				
				// Wenn das ausgewaehlte Object ein Verzeichnis ist, dann in dieses wechseln
				if (item.contenttype == "httpd/unix-directory") {
				   	this.currentPath = item.path;
				   	this.currenItem = null;					
					this.$.spinner.show();
					this.davReq.getDirList(item.path, getDirListContent);					
					this.selectedDirItem = null;					
				} else {
					this.currentItem = item;
					this.showFileActionDialog(item);
				}  				  			  				  				
  				this.selectedDirItem = null;
  			} else {
  				this.$.dirItem.applyStyle("background-color", null);
  			}
  		
  			// Den Pfad des Verzeichnisses/Files entfernen und normalisiert ausgeben
  			this.$.captionDir.setContent(item.filename);
  			this.$.captionMeta.setContent("Last Modified: "+item.lastmodified);
  			
  			// Je nach type des Objectes, ein entsprechende Icon ausgeben
			this.$.dirIcon.setSrc(getImageByMimeType(item.contenttype));  				

  			return true;
  		}
  },
  
  // Oeffnen des ausgewaehlten Verzeichnisses oder Datei
  btnClickOpenDirFile: function (inSender, inEvent) {
  		// Ausgewaehlte Datei/Verzeichnis oeffnen  		  	  				
    	this.selectedDirItem = inEvent.rowIndex;    	
    	this.renderDirListItem(inSender, inEvent.rowIndex);           
  },
  
  // File Liste neu Laden
  btnClickRefreshNavigator: function(inSender,inEvent) {
  		if (this.connected) {
  			this.$.spinner.show();
			this.davReq.getDirList(this.currentPath, getDirListContent);
		}  		
  },   

  // Ein Verzeichnis zurueckgehen
  btnClickDirListBack: function() {  
  		if (this.connected) {
  			this.$.spinner.show();	
  			this.currentPath = this.currentPath.substring(0, this.currentPath.lastIndexOf("/"));  	
  			this.davReq.getDirList(this.currentPath, getDirListContent);
  		}	  		  			  		
  },

  // Das zu loeschende Objekt auf dem Server loeschen und die Liste entsprechend anpassen
  deleteDirListItem: function(inSender, inIndex) {
		this.davReq.deleteObject(this.dirListData[inIndex].path, getDeleteDirListItemResponse);  	
  		this.dirListData.splice(inIndex,1);  		
  		this.$.dirList.render();   
  },

  /* *************** Server Liste bezogene Funktionen ****************** */


  addServerDialogOpen: function(inSender, inEvent) {
  	
	if (!this.changeServer) {
		// Formular leeren
  		this.$.itemName.setValue("");
  		this.$.servername.setValue("");
  		this.$.username.setValue("");
  		this.$.password.setValue("");
  		this.$.protocol.setValue("https");
  		this.$.port.setValue("443");
  		this.$.servername.setStyle("visibility:visible")
  		
 	} else {
 		// Server Informationen in das Formular eintragen
		this.$.itemName.setValue(this.serverData[this.selectedServerItem].name);
		this.$.servername.setValue(this.serverData[this.selectedServerItem].servername);
  		this.$.username.setValue(this.serverData[this.selectedServerItem].username);
  		this.$.password.setValue(this.serverData[this.selectedServerItem].password);
  		this.$.protocol.setValue(this.serverData[this.selectedServerItem].protocol);
  		this.$.port.setValue(this.serverData[this.selectedServerItem].port);    
  		
  		this.$.servername.disabled = true;
  			 		
 	}
		
  },
  
  // Mit Server verbinden und Stammverzeichnis laden
  btnClickConnectServer: function(inSender, inEvent) {
  		if (!this.changeServer) {
  			this.$.spinner.show();
  		}  	   
  		this.selectedServerItem = inEvent.rowIndex;

  		this.$.serverList.render();   		           
  },
  
  // ServerList Eintraege erstellen
  renderServerListItem: function (inSender, inIndex) {  
  		var item = this.serverData[inIndex];
  		
		// Pruefen ob der aktuelle Eintrag ausgewaehlt wurde
		var isSelected = (inIndex == this.selectedServerItem);
		if (isSelected) {
			// Hintergrundfarbe aendern und Server connecten
			this.$.serverItem.applyStyle("background-color", "#CCFFFF");
  			this.currentServer = item;
			this.currentPath = "";
			if (!this.changeServer) { 				
				this.connectWebDavServer(item.servername, item.username, item.password, item.port, item.protocol);
				this.selectedServerItem = null;
			} else {
				this.$.addServerDialog.openAtCenter();				  							
  			}  				  					
  		} else {
  			this.$.serverItem.applyStyle("background-color", null);  				
  		}
  		
  		// Eintrag ausgeben
  		if (item) {  	
			this.$.captionServer.setContent(item.name);
  			return true;
  		}
  },
  
  // Das zu loeschende Server Object aus der Serverliste und der DB entfernen
  deleteServerListItem: function(inSender, inIndex) {		  	
  		var sqlString = "delete from serverliste where servername = '"+this.serverData[inIndex].servername+"' and name = '"+this.serverData[inIndex].name+"' and username = '"+this.serverData[inIndex].username+"';";
  		this.db.transaction(enyo.bind(this,(function(transaction) {	transaction.executeSql(sqlString, [],null,enyo.bind(this,this.showErrorInInfoMessage));})));
  		
  		this.serverData.splice(inIndex,1);  		  		
  		this.$.serverList.render();   
  },
  

  /* ****************** AddServer Dialog bezogene Funktionen ******************* */

  // Server hinzufuegen
  btnClickShowAddServerDialog: function() {  		 
  		this.$.addServerDialog.openAtCenter();
  		this.$.port.setValue("443");
  },

  // Neu angelegten Server speicher:
  btnClickSaveAddServerDialog: function() {
		// Eingaben auslesen
		nvItemName   = this.$.itemName.getValue(); 
  		nvServername = this.$.servername.getValue();
  		nvUsername   = this.$.username.getValue();
  		nvPassword   = this.$.password.getValue();
  		nvProtocol   = this.$.protocol.getValue();
  		nvPort       = this.$.port.getValue();    		  		 		
  		

  		// Neuen Server Speichern oder aktualisieren
  		this.nullHandleCount = 0;  	
  		if (!this.changeServer) {  			
  			var sqlString = 'insert into serverliste (servername,name,username,password,protocol,port) values ("'+nvServername+'","'+nvItemName+'","'+nvUsername+'","'+nvPassword+'","'+nvProtocol+'","'+nvPort+'");';
  			var itemPos = this.serverData.length;
  		} else {
  			var sqlString = 'update serverliste set servername="'+nvServername+'",name="'+nvItemName+'", username="'+nvUsername+'",password="'+nvPassword+'",protocol="'+nvProtocol+'",port="'+nvPort+'" where servername = "'+nvServername+'"';
  			var itemPos = this.selectedServerItem;  			  			
  		}
   		this.db.transaction(enyo.bind(this,(function (transaction) { transaction.executeSql(sqlString,[],null,enyo.bind(this,this.showErrorInInfoMessage));})));	   	
  		
		// Eingaben in ein Array schreiben
  	    this.serverData[itemPos] = {servername: nvServername, name: nvItemName, username: nvUsername, password: nvPassword, protocol: nvProtocol, port: nvPort};		  		 		  		  		
  

  		this.$.serverList.renderRow(itemPos);
  		this.$.serverList.render();
 		
  		this.$.addServerDialog.close();  		
  },
  
  // AddServerDialog schliessen ohne zu speichern
  btnClickCloseAddServerDialog: function() {  	
  		this.$.itemName.setValue("");
  		this.$.servername.setValue("");
  		this.$.username.setValue("");
  		this.$.password.setValue("");
  		this.$.protocol.setValue("https");
  		this.$.port.setValue("443");    		  		 		  		
  		this.$.addServerDialog.close();
  },
  
  // Ein anderes Protokoll wurde ausgewaehlt.
  protocolChanged: function(inSender, inValue, inOldValue) {
  		if (inValue == "https") {
  			this.$.port.setValue("443");		
  		} else {
  			this.$.port.setValue("80");
  		}
  	
  },
  
  
  /* ***************** Info Message Dialog Funktionen ******************* */

  // Info Message schliessen
  btnClickCloseInfoMessageDialog: function(inSender,inEvent) {
  		this.$.infoMessage.setContent("");
  		this.$.infoMessageDialog.close();
  },
  

  // Info Message Fenster mit uebergebenen error Object oeffnen  
  showErrorInInfoMessage: function(inTrans, inError) {
  		this.showInfoMessage("Error Message: "+inError.message+" |  Error Code: "+inError.code);
  },
  
  // Info Message Fenster mit uebergebenen Text oeffnen
  showInfoMessage: function(text) {
  		this.$.infoMessageDialog.openAtCenter();  	
  		this.$.infoMessage.setContent(text);
  },
  
  
  
  /* ***************** WebDAV bezogene Funktionen ********************* */

  // Mit dem WebDav Server verbinden
  connectWebDavServer: function(servername, username, password, port, protocol) {
		// wenn der servername ein verzeichnis mit beinhalltet, dann muss dieser erst einmal entfernt werden.
		var path = "";
		if (servername.indexOf("/") > 0) {	
			path = servername.slice(servername.indexOf("/"),servername.length);
			servername = servername.slice(0,servername.indexOf("/")); 				
		}   			
  			  	
  		this.davReq.init(encodeURI(username).replace("@","%40")+":"+encodeURI(password).replace("@","%40")+"@"+servername,port,protocol);     
  		this.davReq.getDirList(path, getDirListContent);   	  		
	},    
  
});


// request Handler fuer das Auslesen des WebDav Verzeichnisses. Diese Funktion wird aus der davAPI aufgerufen
// content = JSON Object mit folgendem Aufbau {path:, filename, creationdate:, lastmodified:, contenttype:}
function getDirListContent(content,requestState) {	
	if (requestState == 4) {
		webdav.connected = true;
		webdav.$.dirListScroller.scrollTo(0);
		webdav.$.spinner.hide();  				   	
     	webdav.dirListData = content          	
     	webdav.$.dirList.render();
  	}  	
} 


// request Handler fuer das auswerten des Rueckgabecodes des loeschvorganges
function getDeleteDirListItemResponse(content) {
	// Bei dem getesteten webdav server, gab es hier nie response
}

// request Handler fuer das anlegen eines neuen Verzeichnisses
function getCreateFolderRequest(content) {
	// Bei dem getesteten webdav server, gab es hier nie response
	webdav.davReq.getDirList(webdav.currentPath, getDirListContent);
}


// request Handler fuer das uploaden einer Datei
function uploadFileSuccess(content) {
	webdav.davReq.getDirList(webdav.currentPath, getDirListContent);  		
}

// Die eigentliche encodeURI Version scheint unter webos nicht wirklich zu funktionieren, daher diese hier
function myescape(content) {
	content = encodeURI(content);
	return content.replace(/@/g,"%40");
}

// Datei Icon je nach contenttype ausgeben
function getImageByMimeType(contenttype) {
	switch (contenttype) {
		case "application/msword": return "images/mimetype/application-msword.png";
		case "application/pdf": return "images/mimetype/application-pdf.png";
		case "application/pgp-keys": return "images/mimetype/application-pgp-keys.png";
		case "application/rss+xml": return "images/mimetype/application-rss+xml.png";
		case "application/vnd.ms-excel": return "images/mimetype/application-vnd.ms-excel.png";
		case "application/vnd.ms-powerpoint": return "images/mimetype/application-vnd.ms-powerpoint.png";
		case "application/vnd.oasis.opendocument.formula": return "images/mimetype/application-vnd.oasis.opendocument.formula.png";
		case "application/vnd.scribus": return "images/mimetype/application-vnd.scribus.png";
		case "application/x-7zip": return "images/mimetype/application-x-7zip.png";
		case "application/x-ace": return "images/mimetype/application-x-ace.png";
		case "application/x-archive": return "images/mimetype/application-x-archive.png";
		case "application/x-bittorrent": return "images/mimetype/application-x-bittorrent.png";
		case "application/x-cd-image": return "images/mimetype/application-x-cd-image.png";
		case "application/x-cue": return "images/mimetype/application-x-cue.png";
		case "application/x-executable": return "images/mimetype/application-x-executable.png";
		case "application/x-flash-video": return "images/mimetype/application-x-flash-video.png";
		case "application/x-glade": return "images/mimetype/application-x-glade.png";
		case "application/x-gzip": return "images/mimetype/application-x-gzip.png";
		case "application/x-jar": return "images/mimetype/application-x-jar.png";
		case "application/x-ms-dos-executable": return "images/mimetype/application-x-ms-dos-executable.png";
		case "application/x-msdownload": return "images/mimetype/application-x-msdownload.png";
		case "application/x-php": return "images/mimetype/application-x-php.png";
		case "application/x-rar": return "images/mimetype/application-x-rar.png";
		case "application/x-ruby": return "images/mimetype/application-x-ruby.png";
		case "application/x-sln": return "images/mimetype/application-x-sln.png";
		case "application/x-tar": return "images/mimetype/application-x-tar.png";
		case "application/x-theme": return "images/mimetype/application-x-theme.png";
		case "application/x-zip": return "images/mimetype/application-x-zip.png";
		case "application/7zip": return "images/mimetype/application-x-7zip.png";
		case "application/ace": return "images/mimetype/application-x-ace.png";
		case "application/archive": return "images/mimetype/application-x-archive.png";
		case "application/bittorrent": return "images/mimetype/application-x-bittorrent.png";
		case "application/cd-image": return "images/mimetype/application-x-cd-image.png";
		case "application/cue": return "images/mimetype/application-x-cue.png";
		case "application/executable": return "images/mimetype/application-x-executable.png";
		case "application/flash-video": return "images/mimetype/application-x-flash-video.png";
		case "application/glade": return "images/mimetype/application-x-glade.png";
		case "application/gzip": return "images/mimetype/application-x-gzip.png";
		case "application/jar": return "images/mimetype/application-x-jar.png";
		case "application/ms-dos-executable": return "images/mimetype/application-x-ms-dos-executable.png";
		case "application/msdownload": return "images/mimetype/application-x-msdownload.png";
		case "application/php": return "images/mimetype/application-x-php.png";
		case "application/rar": return "images/mimetype/application-x-rar.png";
		case "application/ruby": return "images/mimetype/application-x-ruby.png";
		case "application/sln": return "images/mimetype/application-x-sln.png";
		case "application/tar": return "images/mimetype/application-x-tar.png";
		case "application/theme": return "images/mimetype/application-x-theme.png";
		case "application/zip": return "images/mimetype/application-x-zip.png";		
		case "audio/x-generic": return "images/mimetype/audio-x-generic.png";
		case "audio/x-mp3-playlist": return "images/mimetype/audio-x-mp3-playlist.png";
		case "audio/x-mpeg": return "images/mimetype/audio-x-mpeg.png";
		case "audio/x-ms-wma": return "images/mimetype/audio-x-ms-wma.png";
		case "audio/x-vorbis+ogg": return "images/mimetype/audio-x-vorbis+ogg.png";
		case "audio/x-wav": return "images/mimetype/audio-x-wav.png";
		case "audio/generic": return "images/mimetype/audio-x-generic.png";
		case "audio/mp3-playlist": return "images/mimetype/audio-x-mp3-playlist.png";
		case "audio/mpeg": return "images/mimetype/audio-x-mpeg.png";
		case "audio/ms-wma": return "images/mimetype/audio-x-ms-wma.png";
		case "audio/vorbis+ogg": return "images/mimetype/audio-x-vorbis+ogg.png";
		case "audio/wav": return "images/mimetype/audio-x-wav.png";		
		case "authors": return "images/mimetype/authors.png";
		case "deb": return "images/mimetype/deb.png";
		case "encrypted": return "images/mimetype/encrypted.png";
		case "extension": return "images/mimetype/extension.png";
		case "font/x-generic": return "images/mimetype/font-x-generic.png";
		case "font/generic": return "images/mimetype/font-x-generic.png";
		case "image/bmp": return "images/mimetype/image-bmp.png";
		case "image/gif": return "images/mimetype/image-gif.png";
		case "image/jpeg": return "images/mimetype/image-jpeg.png";
		case "image/png": return "images/mimetype/image-png.png";
		case "image/tiff": return "images/mimetype/image-tiff.png";
		case "image/x-eps": return "images/mimetype/image-x-eps.png";
		case "image/x-generic": return "images/mimetype/image-x-generic.png";
		case "image/x-ico": return "images/mimetype/image-x-ico.png";
		case "image/x-psd": return "images/mimetype/image-x-psd.png";
		case "image/x-xcf": return "images/mimetype/image-x-xcf.png";
		case "image/eps": return "images/mimetype/image-x-eps.png";
		case "image/generic": return "images/mimetype/image-x-generic.png";
		case "image/ico": return "images/mimetype/image-x-ico.png";
		case "image/psd": return "images/mimetype/image-x-psd.png";
		case "image/xcf": return "images/mimetype/image-x-xcf.png";		
		case "message": return "images/mimetype/message.png";
		case "multipart/encrypted": return "images/mimetype/multipart-encrypted.png";
		case "opera/extension": return "images/mimetype/opera-extension.png";
		case "opera/unite-application": return "images/mimetype/opera-unite-application.png";
		case "opera/widget": return "images/mimetype/opera-widget.png";
		case "package/x-generic": return "images/mimetype/package-x-generic.png";
		case "package/generic": return "images/mimetype/package-x-generic.png";		
		case "phatch/actionlist": return "images/mimetype/phatch-actionlist.png";
		case "rpm": return "images/mimetype/rpm.png";
		case "text/css": return "images/mimetype/text-css.png";
		case "text/html": return "images/mimetype/text-html.png";
		case "text/plain": return "images/mimetype/text-plain.png";
		case "text/richtext": return "images/mimetype/text-richtext.png";
		case "text/x-bak": return "images/mimetype/text-x-bak.png";
		case "text/x-bibtex": return "images/mimetype/text-x-bibtex.png";
		case "text/x-changelog": return "images/mimetype/text-x-changelog.png";
		case "text/x-chdr": return "images/mimetype/text-x-chdr.png";
		case "text/x-c++hdr": return "images/mimetype/text-x-c++hdr.png";
		case "text/x-copying": return "images/mimetype/text-x-copying.png";
		case "text/x-c": return "images/mimetype/text-x-c.png";
		case "text/x-c++": return "images/mimetype/text-x-c++.png";
		case "text/x-generic-template": return "images/mimetype/text-x-generic-template.png";
		case "text/xhtml+xml": return "images/mimetype/text-xhtml+xml.png";
		case "text/x-install": return "images/mimetype/text-x-install.png";
		case "text/x-java": return "images/mimetype/text-x-java.png";
		case "text/x-javascript": return "images/mimetype/text-x-javascript.png";
		case "text/x-makefile": return "images/mimetype/text-x-makefile.png";
		case "text/xml": return "images/mimetype/text-xml.png";
		case "text/x-python": return "images/mimetype/text-x-python.png";
		case "text/x-readme": return "images/mimetype/text-x-readme.png";
		case "text/x-script": return "images/mimetype/text-x-script.png";
		case "text/x-source": return "images/mimetype/text-x-source.png";
		case "text/x-sql": return "images/mimetype/text-x-sql.png";
		case "text/x-tex": return "images/mimetype/text-x-tex.png";
		case "text/bak": return "images/mimetype/text-x-bak.png";
		case "text/bibtex": return "images/mimetype/text-x-bibtex.png";
		case "text/changelog": return "images/mimetype/text-x-changelog.png";
		case "text/chdr": return "images/mimetype/text-x-chdr.png";
		case "text/c++hdr": return "images/mimetype/text-x-c++hdr.png";
		case "text/copying": return "images/mimetype/text-x-copying.png";
		case "text/c": return "images/mimetype/text-x-c.png";
		case "text/c++": return "images/mimetype/text-x-c++.png";
		case "text/generic-template": return "images/mimetype/text-x-generic-template.png";
		case "text/install": return "images/mimetype/text-x-install.png";
		case "text/java": return "images/mimetype/text-x-java.png";
		case "text/javascript": return "images/mimetype/text-x-javascript.png";
		case "text/makefile": return "images/mimetype/text-x-makefile.png";
		case "text/python": return "images/mimetype/text-x-python.png";
		case "text/readme": return "images/mimetype/text-x-readme.png";
		case "text/script": return "images/mimetype/text-x-script.png";
		case "text/source": return "images/mimetype/text-x-source.png";
		case "text/sql": return "images/mimetype/text-x-sql.png";
		case "text/tex": return "images/mimetype/text-x-tex.png";
		case "unknown": return "images/mimetype/unknown.png";
		case "vcalendar": return "images/mimetype/vcalendar.png";
		case "video/x-generic": return "images/mimetype/video-x-generic.png";
		case "video/generic": return "images/mimetype/video-x-generic.png";		
		case "x/dia-diagram": return "images/mimetype/x-dia-diagram.png";
		case "x/office-address-book": return "images/mimetype/x-office-address-book.png";
		case "x/office-document": return "images/mimetype/x-office-document.png";
		case "x/office-drawing": return "images/mimetype/x-office-drawing.png";
		case "x/office-presentation": return "images/mimetype/x-office-presentation.png";
		case "x/office-spreadsheet": return "images/mimetype/x-office-spreadsheet.png";
	    case "httpd/unix-directory": return "images/mimetype/httpd-unix-directory.png";
		default: return "images/mimetype/empty.png";
	}
}



 



