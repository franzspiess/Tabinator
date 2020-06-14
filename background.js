const timeouts = {}

chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.set({
    duration: 1800000,
    openTabs: [],
    openGroups: [],
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

chrome.tabs.onUpdated.addListener(info => {
  getValuesFromStoragePromise(['domain', 'currentTab'])
    .then(({
      domain,
      currentTab
    }) => {
      chrome.tabs.query({ active: true }, (tabArray) => {
        const tab = tabArray.find(tab => tab.id === currentTab)
        const newDomain = getDomain(tab && tab.url)
        if (newDomain !== domain) {
          setValuesInStorage({
            domain: newDomain
          })
        }
      })
    })
})

chrome.tabs.onActivated.addListener((info) => {
  const { tabId } = info

  getValuesFromStoragePromise(['duration', 'openTabs', 'openGroups']).then(({
    openTabs,
    duration,
    openGroups,
  }) => {
    chrome.windows.getCurrent({ populate: true }, (window) => {
      let currentDomain
      new Promise(res => {
        res(window.tabs.forEach(tab => {
          const domain = getDomain(tab.url)
          if (tab.active) {
            currentDomain = domain
            clearTimeoutForTab(tab.id)
          }

          if (
            !tab.active &&
            !openTabs.includes(tab.id) &&
            !openGroups.includes(domain) &&
            !timeouts[tab.id]
          ) {
            setTimeoutForTab(tab.id, duration)
          }

        })
        )
      }).then(() => {
        setValuesInStorage({
          currentTab: tabId,
          domain: currentDomain,
        })
      })
    })
  })
})


chrome.tabs.onCreated.addListener(({ id, active }) => {
  if (!active) {
    setTimeoutForTab(id, 64800000)
  }
})

chrome.tabs.onRemoved.addListener((id) => {
  clearTimeoutForTab(id)
})

chrome.runtime.onMessage.addListener(
  (request, _, sendResponse) => {

    if (request.keepOpen) {
      keepOpenClick('openTabs')
    }

    if (request.duration) {
      durationSelectClick(request.duration)
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
      let resultArray = []

      if (tabArray.includes(identifier)) {
        resultArray = [...tabArray.filter(tab => tab !== identifier)]
      } else {
        resultArray = [...tabArray]
        if (identifier !== 'noStandardUrl') {
          resultArray.push(identifier)
        }
      }
      res(resultArray)
    })
  }).then(result => {
    setValuesInStorage({ [key]: result })
  })
}

function durationSelectClick(duration) {
  const newDuration = parseInt(duration)
  getValuesFromStoragePromise(['domain', 'openGroups', 'openTabs']).then(({
    openGroups,
    openTabs
  }) => {
    chrome.windows.getCurrent({ populate: true }, (window) => {
      new Promise(res => res(window.tabs.forEach((tab) => {
        const domain = getDomain(tab.url)
        clearTimeoutForTab(tab.id)
        if (!tab.active &&
          !openTabs.includes(tab.id) &&
          !openGroups.includes(domain)
        ) {
          setTimeoutForTab(tab.id, newDuration)
        }
      }))
      ).then(() => {
        setValuesInStorage({
          duration: newDuration,
        })
      })
    })
  })
}

/*** HELPERS */

function getValuesFromStoragePromise(paramsArray) {
  return new Promise(res => {
    chrome.storage.local.get(paramsArray, (result) => {
      res(result)
    })
  })
}

function setValuesInStorage(setterObj) {
  chrome.storage.local.set(setterObj, () => {
    console.log('SET STORAGE IN ACTIVE TAB')
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

function getDomain(url) {
  if (url) {
    const domainRegex = url.match(/^(?:.*:\/\/)?(?:.*?\.)?([^:\/]*?\.[^:\/]*).*$/)
    return domainRegex ? domainRegex[1] : 'noStandardUrl'
  }
  return 'noStandardUrl'
}