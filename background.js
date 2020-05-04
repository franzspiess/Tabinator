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

chrome.tabs.onUpdated.addListener(info => {

  getValuesFromStoragePromise(['domain', 'currentTab'])
    .then(({
      domain,
      currentTab
    }) => {
      chrome.tabs.query({ active: true }, (tabArray) => {
        const [tab,] = tabArray.filter(tab => tab.id === currentTab)

        const newDomain = getDomain(tab.url)

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

  getValuesFromStoragePromise(['duration', 'openTabs', 'openGroups', 'timeouts']).then(({
    openTabs,
    duration,
    openGroups,
    timeouts
  }) => {
    console.log('NEW TAB ACTIVE', duration, openTabs, openGroups, timeouts)
    chrome.windows.getCurrent({ populate: true }, (window) => {
      let currentDomain
      new Promise(res => {
        res(window.tabs.reduce((acc, tab) => {
          console.log('UUUURRRRLLLL', tab.url)
          const domain = getDomain(tab.url)

          if (tab.active) {
            currentDomain = domain
            return clearTimeoutForTab(acc, tab.id)
          }

          if (
            !tab.active &&
            !openTabs.includes(tab.id) &&
            !openGroups.includes(domain) &&
            !acc[tab.id]
          ) {
            return setTimeoutForTab(acc, tab.id, duration)
          }
          return acc
        }, timeouts))
      }).then(result => {
        setValuesInStorage({
          currentTab: tabId,
          domain: currentDomain,
          timeouts: result
        })
      })
    })
  })
})


chrome.tabs.onCreated.addListener(({ id, active }) => {
  if (!active) {
    getValuesFromStoragePromise(['timeouts'])
      .then(({
        timeouts
      }) => {
        return setTimeoutForTab(timeouts, id, 64800000)
      })
      .then(timeouts => {
        setValuesInStorage({ timeouts })
      })
  }
})

chrome.tabs.onRemoved.addListener((id) => {
  getValuesFromStoragePromise(['timeouts'])
    .then(({
      timeouts
    }) => {
      if (timeouts[id]) {
        return clearTimeoutForTab(timeouts, id)
      }
      return timeouts
    }
    )
    .then(timeouts => {
      setValuesInStorage({ timeouts })
    })
})

chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {

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
    console.log(key)
    chrome.storage.local.get([key, 'currentTab', 'domain'], (storage) => {
      console.log(storage)
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
  getValuesFromStoragePromise(['domain', 'openGroups', 'openTabs', 'timeouts',]).then(({
    openGroups,
    openTabs,
    timeouts
  }) => {
    chrome.windows.getCurrent({ populate: true }, (window) => {
      new Promise(res => res(window.tabs.reduce((acc, tab) => {
        const domain = getDomain(tab.url)

        clearTimeoutForTab(acc, tab.id)
        if (!tab.active &&
          !openTabs.includes(tab.id) &&
          !openGroups.includes(domain)
        ) {
          return setTimeoutForTab(acc, tab.id, newDuration)
        }
        return acc
      }, timeouts))
      ).then(result => {
        setValuesInStorage({
          duration: newDuration,
          timeouts: result
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
    console.log(JSON.stringify(setterObj), 'SET STORAGE IN ACTIVE TAB')
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

function getDomain(url) {
  const domainRegex = url.match(/^(?:.*:\/\/)?(?:.*?\.)?([^:\/]*?\.[^:\/]*).*$/)
  return domainRegex ? domainRegex[1] : 'noStandardUrl'
}