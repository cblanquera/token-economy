window.addEventListener('web3sdk-ready', async _ => {
  //------------------------------------------------------------------//
  // Variables

  const network = Web3SDK.network('ethereum')
  const vesting = network.contract('vesting')

  const months = [
    'JAN', 'FEB', 'MAR', 'APR', 
    'MAY', 'JUN', 'JUL', 'AUG', 
    'SEP', 'OCT', 'NOV', 'DEC'
  ]

  //------------------------------------------------------------------//
  // Functions 

  const populate = function() {
    const { 
      vesting, 
      paused, 
      totalReleasableAmount, 
      totalVestedAmount 
    } = Web3SDK.state

    const toEther = (...args) => Web3SDK.toEther(...args)

    //determine all the final formatted values
    const vestedStartDate = new Date(vesting.startDate * 1000)
    const vestedEndDate = new Date(vesting.endDate * 1000)
    const totalVesting = parseFloat(
      toEther(vesting.total)
    ).toLocaleString('en')
    const totalReleaseable = toEther(totalReleasableAmount) < 100
      ? toEther(totalReleasableAmount)
      : parseFloat(
        toEther(totalReleasableAmount)
      ).toLocaleString('en')
    const totalReleased = toEther(vesting.released) 
      ? toEther(vesting.released)
      : parseFloat(
        toEther(vesting.released)
      ).toLocaleString('en')

    let progress = `${Math.max(0.01, totalVestedAmount / vesting.total) * 100}%`
    let totalVested = toEther(totalVestedAmount)

    //update HTML values
    document.getElementById('progress').style.width = progress
    document.getElementById('progress-total-vested').innerHTML = parseFloat(totalVested).toLocaleString('en')
    document.getElementById('progress-total-vesting').innerHTML = totalVesting
    document.getElementById('total-vesting').innerHTML = totalVesting
    document.getElementById('claimable').innerHTML = paused ? 'Waiting on TGE': 'Now'
    document.getElementById('total-releaseable').innerHTML = !paused ? totalReleaseable: 'Nothing right now.'
    document.getElementById('total-released').innerHTML = totalReleased
    document.getElementById('vesting-start-date').innerHTML = [
      months[vestedStartDate.getMonth()],
      vestedStartDate.getDate(),
      vestedStartDate.getFullYear()
    ].join(' ')
    document.getElementById('vesting-end-date').innerHTML = [
      months[vestedEndDate.getMonth()],
      vestedEndDate.getDate(),
      vestedEndDate.getFullYear()
    ].join(' ')

    if (!paused && totalReleasableAmount > 0) {
      document.getElementById('claim').style.display = 'inline-block'
    }

    const duration = vesting.endDate - vesting.startDate
    const increment = toEther(vesting.total) / duration
    setInterval(() => {
      totalVested = parseFloat(totalVested) + parseFloat(increment)
      progress = `${Math.max(0.01, totalVested / toEther(vesting.total)) * 100}%`

      document.getElementById('progress').style.width = progress
      document.getElementById('progress-total-vested').innerHTML = parseFloat(totalVested).toLocaleString('en')
    }, 1000)
  }

  //------------------------------------------------------------------//
  // Events

  window.addEventListener('web3sdk-connected', async _ => {
    const { account } = Web3SDK.state 
    //check if vesting
    const info = await (vesting.read().vesting(account))
    if (info.total == 0) {
      theme.hide('.disconnected', false)
      theme.hide('.connected', true)
      return notify('error', 'Not Vesting')
    }

    //update state vesting
    const now = Math.floor(Date.now() / 1000)
    Web3SDK.state.vesting = info
    Web3SDK.state.paused = await (vesting.read().paused())
    Web3SDK.state.totalReleasableAmount = await (
      vesting.read().totalReleasableAmount(account, now)
    )
    Web3SDK.state.totalVestedAmount = await (
      vesting.read().totalVestedAmount(account, now)
    )
    //update UI
    populate()
  })

  window.addEventListener('web3sdk-disconnected',  async _ => {
    delete Web3SDK.state.paused
    delete Web3SDK.state.vesting
    delete Web3SDK.state.totalReleasableAmount
    delete Web3SDK.state.totalVestedAmount
  })

  window.addEventListener('claim-click', async(e) => {
    const { account } = Web3SDK.state
    if (!account) {
      return notify('Wallet is not connected')
    }

    try {
      await (vesting.write(account, false, 2).release(account))
    } catch(e) {
      return notify('error', e.message)
    }
  })

  window.addEventListener('watch-click', async (e) => {
    await network.contract('token').addToWallet()
  })

  //------------------------------------------------------------------//
  // Initialize
})