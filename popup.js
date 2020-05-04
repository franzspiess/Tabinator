$(document).ready(() => {
    $('select').formSelect();
    const durationSelect = $('#duration')
    chrome.storage.local.get(['duration'], (result) => {
        $('option:selected').removeAttr('selected')
        $('#duration option[value="' + result.duration + '"]').prop('selected', true)
    })
    const keepOpenInput = $('#keepOpen')
    deriveInputState(keepOpenInput)

    const keepGroupOpenInput = $('#keepGroupOpen')
    deriveInputState(keepGroupOpenInput)

    durationSelect.change(() => {
        chrome.runtime.sendMessage({
            duration: $("select#duration option:selected").val()
        }, (response) => {
            console.log(response, 'DURATION')
        })
    })

    keepOpenInput.click(() => {
        chrome.runtime.sendMessage({
            keepOpen: 'CLICK'
        }, (response) => {
            console.log(response, 'KEEPOPEN')
        })
    })

    keepGroupOpenInput.click(() => {
        chrome.runtime.sendMessage({
            keepGroupOpen: 'CLICK'
        }, (response) => {
            console.log(response, 'KEEPGROUPOPEN')
        })
    })
})

function deriveInputState(node) {

    const id = node.attr('id')

    if (id === 'keepOpen') {
        chrome.storage.local.get(['openTabs', 'currentTab'], (response) => {
            node.prop('checked', response.openTabs.includes(response.currentTab))
        })
    }

    if (id === 'keepGroupOpen') {
        chrome.storage.local.get(['openGroups', 'domain'], (response) => {
            node.prop('checked', response.openGroups.includes(response.domain))
        })
    }

}
