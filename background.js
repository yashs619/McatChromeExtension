chrome.webRequest.onBeforeRequest.addListener( function (details) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        var activeTab = tabs[0];
        var userID;  
        var prevUrl = tabs[0].url;
        chrome.identity.getProfileUserInfo(function (object) {
          userID = object.email;
          chrome.tabs.sendMessage(activeTab.id, {"id" : userID,"pURL": prevUrl});
        });
      });        
  },
  {urls: ["https://www.facebook.com/*"]}
  );