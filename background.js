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
  console.log(info, 'INFO')
  const tabId = info.tabId
  chrome.storage.local.set({ currentTab: tabId }, () => {
  })
  chrome.storage.local.get(['duration', 'openTabs','openGroups'], (result) => {
    const { openTabs, duration, openGroups } = result
    console.log(duration, timeouts, openTabs, 'CCCCC')
    chrome.windows.getCurrent({ populate: true }, (window) => {
      window.tabs.forEach(tab => {
        const domainRegex = tab.url.match(/^(?:.*:\/\/)?(?:.*?\.)?([^:\/]*?\.[^:\/]*).*$/)
        const domain = domainRegex ? domainRegex[1] : 'noStandardUrl'
        if (tab.active) {
          console.log(tab.id, 'REMOVED')
          clearTimeoutForTab(tab.id)
        }
        if (
          !tab.active && 
          !openTabs.includes(tab.id) && 
          !openGroups.includes(domain) &&
          !timeouts[tab.id]
          ) {
          console.log(domain,tab, 'ADDED')
          setTimeoutForTab(tab.id, duration)
        }

      })
    })
  })
})

// ^(?:.*:\/\/)?(?:.*?\.)?([^:\/]*?\.[^:\/]*).*$
// /^(?:https?:)?(?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/i
// 

// chrome.tabs.onCreated.addListener(({ id }) => {
//   chrome.storage.local.get(['duration'], (result) => {
//     console.log('CREATED')
//     setTimeoutForTab(id, result.duration)
//   })
// })

chrome.tabs.onRemoved.addListener((id) => {
  if (timeouts[id]) {
    clearTimeoutForTab(id)
  }
})

chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    if (request.keepOpen) {
      keepOpenClick(sendResponse)
    }
    if (request.duration) {
      console.log(request)
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
      keepGroupOpenClick()
    }
    sendResponse('RECEIVED')
  });

function keepOpenClick() {
  new Promise(res => {
    chrome.storage.local.get(['openTabs', 'currentTab', 'duration'], ({ openTabs, currentTab, duration }) => {
      if (openTabs.includes(currentTab)) {
        openTabs = openTabs.filter(tab => {
          tab === currentTab
        })
        setTimeoutForTab(currentTab, duration)
      }
      else {
        openTabs.push(currentTab)
        clearTimeoutForTab(currentTab)
      }
      res(openTabs)
    })
  }).then(openTabs => {
    chrome.storage.local.set({ openTabs }, () => {
      console.log('setOpenTabs', openTabs)
    })
  })
}

function keepGroupOpenClick() {
  new Promise(res => {
    chrome.tabs.query({ active: true }, ([tab]) => {
      const domain = tab.url.match(/^(?:.*:\/\/)?(?:.*?\.)?([^:\/]*?\.[^:\/]*).*$/)[1]
      chrome.storage.local.get(['openGroups', 'currentTab', 'duration'], ({ openGroups, currentTab, duration }) => {
        if (openGroups.includes(domain)) {
          openGroups = openGroups.filter(string => {
            string === domain
          })
          setTimeoutForTab(currentTab, duration)
        }
        else {
          openGroups.push(domain)
          clearTimeoutForTab(currentTab)
        }
        res(openGroups)
      })
    })
  }).then(openGroups => {
    chrome.storage.local.set({ openGroups }, () => {
      console.log('setOpenGroups', openGroups)
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
