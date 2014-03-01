function davApi() {

	this.server = "";
	this.protocol = "";
	
	// Initializieren der Klasse
	this.init = function(server,port,protocol) {
		this.server = server+":"+port;
		this.protocol = protocol;
	}
	
	/* Verzeichnis Struktur auslesen
		---------------------------------------------------
		
		Uebergabeparameter:
			path    = Auszulesendes Verzeichnis
			handler = Beinhaltet die Funktion welche das Ergebnis (Inhalt des Verzeichnisses) bearbeiten soll.
						 Der Handler muss wie folgt aussehen: handler(JSON Object);
						 
						 Das JSON Object ist wie folgt aufgebaut:
						 {path:, filename:, creationdate:, lastmodified:, contenttype:}
			
	*/
	this.getDirList = function(path, handler) {
		
	   	var request = new XMLHttpRequest();
	   	
		// the path have to end with a slash "/"		
		if (path.lastIndexOf("/")+1 < path.length) {
			path = path+"/";
		}
		
//enyo.log('PROPFIND '+this.protocol+"://"+this.server+encodeURI(path));   	
    	request.open('PROPFIND', this.protocol+"://"+this.server+encodeURI(path), true);
    	request.setRequestHeader('Depth', 1);
    	request.setRequestHeader('Content-Type', 'application/x-www-form-escaped');

		// Es muss ein bestimmtes XML Format an den Server gesendet werden, um entsprechende Rueckmeldung zu bekommen
      var xml = '<?xml version="1.0" encoding="utf-8" ?><D:propfind xmlns:D="DAV:"><D:allprop /></D:propfind>';
      
    	request.onreadystatechange = function() {
    		// Request war erfolgreich
			if (request.readyState == 4) {
				// Response Elemente laden und in der schleife durchlaufen um die sich darunter befindlichen Daten auszulesen 
				if (request.responseXML) {
					// Check if the response is a old rfc implementation or a new one.
					var xmltype = request.responseXML.getElementsByTagName("multistatus")[0].getAttribute("xmlns:s");
					if (xmltype) {
						xmltype = "RFC2518"
					} else {
						xmltype = "RFC4437";						
					}
					
					var xmlRequest = request.responseXML.getElementsByTagName("response");				 
					var count = xmlRequest.length;
				
					// Speichern der Dateistruktur in einem JSON Object
					var dirListData = [];  				
				
            	for ( var i = 1; i < count; i++ ) {
	            	var hrefValue = xmlRequest[i].getElementsByTagName("href")[0].firstChild.nodeValue;
	            	try {
	            		var getlastmodifiedValue = xmlRequest[i].getElementsByTagName("getlastmodified")[0].firstChild.nodeValue;
	            	} catch (e) {
	            		var getlastmodifiedValue = "";
	            	}	            	       
	            	
	            	if (xmltype == "RFC4437") {
	            		var creationdateValue    = xmlRequest[i].getElementsByTagName("creationdate")[0].firstChild.nodeValue; 
	            		var getlastmodifiedValue = xmlRequest[i].getElementsByTagName("getlastmodified")[0].firstChild.nodeValue;
	            		var getcontenttypeValue  = xmlRequest[i].getElementsByTagName("getcontenttype")[0].firstChild.nodeValue;
	            	}
	            	
	            	if (xmltype == "RFC2518") {
	            		var creationdateValue   = "";
	            		var getcontenttypeValue = "";
	            		if (xmlRequest[i].getElementsByTagName("collection")[0]) {
	            			getcontenttypeValue  = "httpd/unix-directory";
	            		} else {
	            			getcontenttypeValue  = getContentType(hrefValue);
	            		}	            		
	            	}
					
					// Nur den Dateinamen ausgeben, wenn das Letzte Zeichen ein "/" ist, muss dieses erst einmal entfernt werden
					if (hrefValue.length > 1 && hrefValue.lastIndexOf("/") == hrefValue.length-1) {
						hrefValue = hrefValue.substring(0,hrefValue.lastIndexOf("/"));
					}
					
	            	var hrefNorm = new Array;
  					hrefNorm = hrefValue.split("/");
  					//enyo.log("path: "+decodeURI(hrefValue)+", filename: "+decodeURI(hrefNorm[hrefNorm.length-1])+", creationdate: "+creationdateValue+", lastmodified: "+getlastmodifiedValue+", contenttype: "+getcontenttypeValue);					
     
					dirListData.push({path: decodeURI(hrefValue), filename: decodeURI(hrefNorm[hrefNorm.length-1]), creationdate: creationdateValue, lastmodified: getlastmodifiedValue, contenttype: getcontenttypeValue});
      
            	}
            	// Aufrufen der uebergebenen Funktion
            	handler(dirListData,request.readyState);
            } 
         } else {
         	handler(null,request.readyState);
         }         
    	}
    	request.send(xml);
	}	
	
	/* Datei herunterladen
		---------------------------------------------------
		
		Uebergabeparameter:
			file        = Die Datei welche geladen werden soll, dies im Format "/path/filename"
			contenttype = Dies ist der Type des files
			handler     = Beinhaltet die Funktion welche das Ergebnis (Inhalt der Datei) bearbeiten soll.	
					
	*/	
	this.getFile = function(file, contenttype, handler) {
   	var request = new XMLHttpRequest();

//enyo.log('GET '+this.protocol+"://"+this.server+encodeURI(file));
    	request.open('GET', this.protocol+"://"+this.server+encodeURI(file), true);
    	request.setRequestHeader('Depth', 0);
    	request.setRequestHeader('Content-Type', contenttype);

    	request.onreadystatechange = function() {
    		// Request war erfolgreich
			if (request.readyState == 4) {
				if (request.responseText) {
					handler(request.responseText);
				}
			}	
		}
		request.send();		
	}	
	
	
	/* Datei oder Verzeichnis loeschen
		---------------------------------------------------
		
		Uebergabeparameter:
			file    = Die Datei oder das Verzeichnis, welches geloescht werden soll, dies im Format "/path/filename"
			handler = Beinhaltet die Funktion welche das Ergebnis bearbeiten soll.
							
	*/	
	this.deleteObject = function(object, handler) {
   	var request = new XMLHttpRequest();
    	request.open('DELETE', this.protocol+"://"+this.server+encodeURI(object), true);

    	request.onreadystatechange = function() {
    		// Request war erfolgreich
			if (request.readyState == 4) {
				if (request.responseText) {
					var xmlRequest = request.responseXML.getElementsByTagName("response");				 

					// Speichern der Dateistruktur in einem JSON Object
					var response = [];  								
	            
	            var hrefValue	 = xmlRequest[0].getElementsByTagName("href")[0].firstChild.nodeValue;
	            var statusValue = xmlRequest[0].getElementsByTagName("status")[0].firstChild.nodeValue; 
	            var errorValue  = xmlRequest[0].getElementsByTagName("error")[0].firstChild.nodeValue;
     
					response.push({path: decodeURI(hrefValue), status: statusValue, error: errorValue});      
					handler(response);				
				}				
			}	
		}
		request.send();		
	}		


	/* Verzeichnis erstellen
		---------------------------------------------------
		
		Uebergabeparameter:
			file        = Die Datei welche geladen werden soll, dies im Format "/path/filename"
			handler     = Beinhaltet die Funktion welche das Ergebnis (Inhalt der Datei) bearbeiten soll.	
					
	*/	
	this.createDir = function(file, handler) {
   	var request = new XMLHttpRequest();
    	request.open('MKCOL', this.protocol+"://"+this.server+encodeURI(file), true);

    	request.onreadystatechange = function() {
    		// Request war erfolgreich
			if (request.readyState == 4) {
				handler(request.responseText);
			}	
		}
		request.send();		
	}	
	
	
	/* Datei hochladen
		---------------------------------------------------
		
		Uebergabeparameter:
			file        = Die Datei welche geladen werden soll, dies im Format "/path/filename"
			handler     = Beinhaltet die Funktion welche das Ergebnis (Inhalt der Datei) bearbeiten soll.	
					
	*/	
	this.uploadFile = function(filepath, content, handler) {
   		var request = new XMLHttpRequest();
    	request.open('PUT', this.protocol+"://"+this.server+encodeURI(filepath), true);
    	request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    	request.onreadystatechange = function() {
    		// Request war erfolgreich
			if (request.readyState == 4) {
				handler(request.responseText);
			}	
		}		
		request.send(content);		
	}					
}

// Datei Icon je nach contenttype ausgeben
function getContentType(filename) {
	var fend = filename.slice(filename.lastIndexOf(".")+1,filename.length);
	switch (fend) {
		case "doc": return "application/msword";
		case "pdf": return "application/pdf";
		case "pgp": return "application/pgp-keys";
		case "rss": return "application/rss+xml";
		case "xls": return "application/vnd.ms-excel";
		case "ppd": return "application/vnd.ms-powerpoint";
		case "7p": return "application/7zip";
		case "ace": return "application/ace";
		case "torrent": return "application/bittorrent";
		case "iso": return "application/cd-image";
		case "cue": return "application/cue";
		case "exe": return "application/executable";
		case "flv": return "application/flash-video";
		case "glade": return "application/glade";
		case "zip": return "application/gzip";
		case "jar": return "application/jar";
		case "exe": return "application/ms-dos-executable";
		case "php": return "application/php";
		case "rar": return "application/rar";
		case "rb": return "application/ruby";
		case "sln": return "application/sln";
		case "tar": return "application/tar";
		case "theme": return "application/theme";
		case "zip": return "application/zip";
		case "pls": return "audio/mp3-playlist";
		case "mpg": return "audio/mpeg";
		case "wma": return "audio/ms-wma";
		case "ogg": return "audio/vorbis+ogg";
		case "wav": return "audio/wav";
		case "dev": return "deb";
		case "bmp": return "image/bmp";
		case "gif": return "image/gif";
		case "jpg": return "image/jpeg";
		case "jpeg": return "image/jpeg";
		case "png": return "image/png";
		case "tiff": return "image/tiff";
		case "eps": return "image/eps";
		case "ico": return "image/ico";
		case "psd": return "image/psd";
		case "xcf": return "image/xcf";
		case "rpm": return "rpm";
		case "css": return "text/css";
		case "html": return "text/html";
		case "txt": return "text/plain";
		case "rdf": return "text/richtext";
		case "bak": return "text/bak";
		case "tex": return "text/bibtex";
		case "c": return "text/c";
		case "cpp": return "text/c++";
		case "java": return "text/java";
		case "js": return "text/javascript";
		case "mak": return "text/makefile";
		case "py": return "text/python";
		case "readme": return "text/readme";
		case "sql": return "text/sql";
		case "tex": return "text/tex";
		case "ical": return "vcalendar";
		default: return "text/plain";
	}
}
