window.addEventListener('web3sdk-ready', async _ => {
  //------------------------------------------------------------------//
  // Variables

  const network = Web3SDK.network('ethereum')
  const vesting = network.contract('vesting')
  const sale = network.contract('sale')

  const amountOfTokenToPurchase = document.getElementById('amount')
  const amountOfTotalEthItCosts = document.getElementById('conversion') 

  const months = [
    'JAN', 'FEB', 'MAR', 'APR', 
    'MAY', 'JUN', 'JUL', 'AUG', 
    'SEP', 'OCT', 'NOV', 'DEC'
  ]

  //------------------------------------------------------------------//
  // Functions 
  //------------------------------------------------------------------//
  // Events

  document.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault()
    return false
  })

  window.addEventListener('web3sdk-connected', async _ => {
    Web3SDK.state.tokenLimit = await (sale.read().currentTokenLimit())
    Web3SDK.state.tokenAllocated = await (vesting.read().totalAllocated())
    Web3SDK.state.vestedDate = await (sale.read().currentVestedDate())
    Web3SDK.state.decimals = 18
    Web3SDK.state.price = await (sale.read().currentTokenPrice())

    const {
      tokenLimit,
      tokenAllocated,
      vestedDate,
      price
    } = Web3SDK.state

    const toEther = (...args) => Web3SDK.toEther(...args)

    const unitPrice = toEther(price)
    const vested = new Date(vestedDate * 1000)
    const percent = `${(tokenAllocated / tokenLimit) * 100}%`
    const amount = amountOfTokenToPurchase.value
    
    const currentAllocation = parseFloat(
      toEther(tokenAllocated)
    ).toLocaleString('en')
    
    const maxAllocation = parseFloat(
      toEther(tokenLimit)
    ).toLocaleString('en')
    
    document.getElementById('progress').style.width = percent
    document.getElementById('current-allocation').innerHTML = currentAllocation
    document.getElementById('max-allocation').innerHTML = maxAllocation
    document.getElementById('unit-price').innerHTML = `${unitPrice.substring(0, 9)} ETH`
    document.getElementById('vested-date').innerHTML = [
      months[vested.getMonth()],
      vested.getDate(),
      vested.getFullYear()
    ].join(' ')

    amountOfTotalEthItCosts.innerHTML = `${
      (unitPrice * amount).toLocaleString('en')
    } ETH`
  })

  window.addEventListener('web3sdk-disconnected',  async _ => {
    //delete states
    delete Web3SDK.state.unitPrice
    delete Web3SDK.state.tokenLimit
    delete Web3SDK.state.tokenAllocated
    delete Web3SDK.state.vestedDate
  })

  window.addEventListener('calculate-keyup', (e) => {
    const { price, decimals, account } = Web3SDK.state
    if (!account) {
      return
    }

    setTimeout(async () => {
      const unitPrice = price / Math.pow(10, decimals)
      amountOfTotalEthItCosts.innerHTML = `${
        (unitPrice * amountOfTokenToPurchase.value).toLocaleString('en')
      } ETH`
    }, 100)
  })

  window.addEventListener('buy-submit', async(e) => {
    const { account, price } = Web3SDK.state
    if (!account) {
      return notify('Wallet is not connected')
    }

    const toWei = (...args) => Web3SDK.toWei(...args)
    const toEther = (...args) => Web3SDK.toEther(...args)
    const toBigNumber = (...args) => Web3SDK.toBigNumber(...args)

    const method = 'buy(address,uint256)'
    const amount = amountOfTokenToPurchase.value
    const totalETHAmount = toBigNumber(price)
      .mul(toBigNumber(amount))
      .toString()

    //check if vesting already
    const isVesting = await vesting.read().vesting(account)
    if (isVesting.total > 0) {
      return notify('error', 'Address is already vesting')
    }

    //gas check
    try {
      await (
        sale.gas(account, totalETHAmount)[method](account, toWei(amount))
      )
    } catch(e) {
      const pattern = /have (\d+) want (\d+)/
      const matches = e.message.match(pattern)
      if (matches?.length === 3) {
        e.message = e.message.replace(pattern, `have ${
          toEther(matches[1], 'int').toFixed(5)
        } ETH want ${
          toEther(matches[2], 'int').toFixed(5)
        } ETH`)
      }
      return notify('error', e.message.replace('err: i', 'I'))
    }

    try {
      await (
        sale.write(account, totalETHAmount, 2)[method](account, toWei(amount))
      )
      window.location.href = '/vesting.html'
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