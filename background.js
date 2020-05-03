// const timeouts = {}

chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.set({
    duration: 1800000,
    openTabs: [],
    openGroups: [],
    timeouts: {}
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
  // console.log(timeouts, 'TIMEOUTS')
  const tabId = info.tabId

  getParamsPromise(['duration', 'openTabs', 'openGroups', 'timeouts']).then(({
    openTabs,
    duration,
    openGroups,
    timeouts
  }) => {
    console.log(timeouts, 'ARGUMENTS')

    chrome.windows.getCurrent({ populate: true }, (window) => {
      let currentDomain
      new Promise(res => {
        res(window.tabs.reduce((acc, tab) => {
          const domainRegex = tab.url.match(/^(?:.*:\/\/)?(?:.*?\.)?([^:\/]*?\.[^:\/]*).*$/)
          const domain = domainRegex ? domainRegex[1] : 'noStandardUrl'

          if (tab.active) {
            currentDomain = domain
            console.log(tab.id, 'REMOVED')
            clearTimeoutForTab(acc, tab.id)
          }

          if (
            !tab.active &&
            !openTabs.includes(tab.id) &&
            !openGroups.includes(domain) &&
            !acc[tab.id]
          ) {
            console.log('ADDED', tab.id, domain, duration)
            setTimeoutForTab(acc, tab.id, duration)
          }
          return acc
        }, timeouts))
      }).then(result => {
        chrome.storage.local.set({
          currentTab: tabId,
          domain: currentDomain,
          timeouts: result
        }, () => {
          console.log(tabId, currentDomain, result, 'SET STORAGE IN ACTIVE TAB')
        })
      })
    })

  })
})
// chrome.storage.local.get(['duration', 'openTabs', 'openGroups'], (result) => {
//   const { openTabs, duration, openGroups } = result

function getParamsPromise(paramsArray) {
  return new Promise(res => {
    chrome.storage.local.get(paramsArray, (result) => {
      res(result)
    })
  })
}

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
      const newDuration = parseInt(request.duration)
      getParamsPromise(['openGroups', 'openTabs', 'timeouts']).then(({
        openGroups,
        openTabs,
        timeouts
      }) => {
        chrome.windows.getCurrent({ populate: true }, (window) => {
          new Promise(res => res(window.tabs.reduce((acc, tab) => {
            const domainRegex = tab.url.match(/^(?:.*:\/\/)?(?:.*?\.)?([^:\/]*?\.[^:\/]*).*$/)
            const domain = domainRegex ? domainRegex[1] : 'noStandardUrl'

            clearTimeoutForTab(acc, tab.id)
            if (!tab.active &&
              !acc.includes(tab.id) &&
              !openGroups.includes(domain)
            ) {
              setTimeoutForTab(acc, tab.id, newDuration)
            }
            return acc
          }, timeouts))
          ).then(result => {
            chrome.storage.local.set({
              duration: newDuration,
              timeouts: result
            }, () => {
              console.log(newDuration, result, 'SET STORAGE IN ACTIVE TAB')
            })
          })
        })
      })
      // chrome.storage.local.set({ duration: newDuration }, () => {
      //   timeoutDuration = newDuration
      // })
      // chrome.storage.local.get(['openTabs'], (result) => {
      // const { openTabs } = result
      // })
    }

    if (request.keepGroupOpen) {
      keepOpenClick('openGroups')
    }

    sendResponse('RECEIVED')
  });

function keepOpenClick(key) {
  new Promise(res => {
    chrome.storage.local.get([key, 'currentTab', 'domain'], (storage) => {
      const { currentTab, domain } = storage
      const tabArray = storage[key]
      const identifier = key === 'openTabs' ? currentTab : domain

      if (tabArray.includes(identifier)) {
        resultArray = tabArray.filter(tab => tab !== identifier)
      } else {
        resultArray = [...tabArray, identifier]
        clearTimeoutForTab(currentTab)
      }

      res(resultArray)

    })
  }).then(result => {
    chrome.storage.local.set({ [key]: result }, () => {
      console.log(`SET STORAGE ${key} : ${result}`)
    })
  })
}

function setTimeoutForTab(timeouts, tab, timeoutDuration) {
  console.log(arguments)
  timeouts[tab] = setTimeout(() => {
    chrome.tabs.remove(tab)
  }, timeoutDuration)
  return timeouts
}

function clearTimeoutForTab(timeouts, tab) {
  console.log(arguments)
  clearTimeout(timeouts[tab])
  delete timeouts[tab]
  return timeouts
}


  // ^(?:.*:\/\/)?(?:.*?\.)?([^:\/]*?\.[^:\/]*).*$
  // /^(?:https?:)?(?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/i