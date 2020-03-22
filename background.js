chrome.runtime.onInstalled.addListener(function() {


  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
        pageUrl: {hostEquals: 'developer.chrome.com'},
      })
      ],
          actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });

});

// chrome.tabs.onCreated.addListener((tab)=> {
//   alert(JSON.stringify(tab))
//   // setTimeout(()=> {
//   //   chrome.tabs.remove(tab.id)
//   // },1000)
// } )