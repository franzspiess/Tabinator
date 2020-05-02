const timeouts = {}

chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.set({
    duration: 1800000,
    openTabs: [],
    openGroups: []
  }, () => {
  })
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
        pageUrl: { schemes: ['http', 'https', 'chrome'] },
      })
      ],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });

});


chrome.tabs.onActivated.addListener((info) => {
  const tabId = info.tabId

  chrome.storage.local.get(['duration', 'openTabs', 'openGroups'], (result) => {
    const { openTabs, duration, openGroups } = result

    chrome.windows.getCurrent({ populate: true }, (window) => {
      window.tabs.forEach(tab => {
        const domainRegex = tab.url.match(/^(?:.*:\/\/)?(?:.*?\.)?([^:\/]*?\.[^:\/]*).*$/)
        const domain = domainRegex ? domainRegex[1] : 'noStandardUrl'


        if (tab.active) {
          console.log(tab.id, 'REMOVED')
          chrome.storage.local.set({
            currentTab: tabId,
            domain
          }, () => {
            console.log(tabId, domain, 'SET STORAGE IN ACTIVE TAB')
          })
          clearTimeoutForTab(tab.id)
        }

        if (
          !tab.active &&
          !openTabs.includes(tab.id) &&
          !openGroups.includes(domain) &&
          !timeouts[tab.id]
        ) {
          console.log('ADDED', tab.id, domain)
          setTimeoutForTab(tab.id, duration)
        }

      })
    })
  })
})

chrome.tabs.onCreated.addListener(({ id }) => {
  timeouts[id] = 'TOUCHED'
  console.log('TOUCHED', id)
})

chrome.tabs.onRemoved.addListener((id) => {
  if (timeouts[id]) {
    clearTimeoutForTab(id)
  }
})

chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    
    if (request.keepOpen) {
      keepOpenClick('openTabs')
    }
    
    if (request.duration) {
      const duration = parseInt(request.duration)
      chrome.storage.local.set({ duration }, () => {
        timeoutDuration = duration
      })
      chrome.storage.local.get(['openTabs'], (result) => {
        const { openTabs } = result
        chrome.windows.getCurrent({ populate: true }, (window) => {
          window.tabs.forEach(tab => {
            clearTimeoutForTab(tab.id)
            if (!tab.active && !openTabs.includes(tab.id)) {
              setTimeoutForTab(tab.id, duration)
            }
          })
        })
      })
    }
    
    if (request.keepGroupOpen) {
      keepOpenClick('openGroups')
    }
    
    sendResponse('RECEIVED')
  });
  
  function keepOpenClick(key) {
    new Promise(res => {
      chrome.storage.local.get([key, 'currentTab', 'domain', 'duration'], (storage) => {
        const { currentTab, domain, duration } = storage
        const tabArray = storage[key]
        const identifier = key === 'openTabs' ? currentTab : domain
        
        if (tabArray.includes(identifier)) {
          resultArray = tabArray.filter(tab => {
            tab === identifier
          })
          setTimeoutForTab(currentTab, duration)
        } else {
          resultArray = [...tabArray,identifier]
          clearTimeoutForTab(currentTab)
        }
        
        res(resultArray)
        
      })
    }).then(result => {
      chrome.storage.local.set({ [key]: result  }, () => {
        console.log(`SET STORAGE ${key} : ${result}`)
      })
    })
  }
  
  function setTimeoutForTab(tab, timeoutDuration) {
    timeouts[tab] = setTimeout(() => {
      chrome.tabs.remove(tab)
    }, timeoutDuration)
  }
  
  function clearTimeoutForTab(tab) {
    clearTimeout(timeouts[tab])
    delete timeouts[tab]
  }
  
  
  // ^(?:.*:\/\/)?(?:.*?\.)?([^:\/]*?\.[^:\/]*).*$
  // /^(?:https?:)?(?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/i
  // 