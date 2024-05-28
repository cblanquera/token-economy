window.addEventListener('web3sdk-ready', async _ => {
  //------------------------------------------------------------------//
  // Variables

  const network = Web3SDK.network('ethereum')
  const token = network.contract('token')
  const swap = network.contract('swap')

  let buyingTokenFor = 0
  let tokenBalance = 0
  
  const input = document.getElementById('token')
  const output = document.getElementById('eth')

  const balanceETH = document.querySelector('div.balance-eth')
  const balanceToken = document.querySelector('div.balance-token')

  //------------------------------------------------------------------//
  // Functions 

  const toFixed = function(number, length = 4) {
    const parts = number.toString().split('.')
    const size = length >= parts[0].length ? length - parts[0].length: 0
    if (parts[0].length > 9) {
      return (parseInt(parts[0]) / 1000000000).toFixed(2) + 'B'
    } else if (parts[0].length > 6) {
      return (parseInt(parts[0]) / 1000000).toFixed(2) + 'M'
    } else if (parts[0].length > 3) {
      return (parseInt(parts[0]) / 1000).toFixed(2) + 'K'
    }
    return number.toFixed(size)
  }

  const weiToFixed = function(number, length = 4) {
    return toFixed(Web3SDK.toEther(number, 'number'), length)
  }

  const asyncSetInterval = (callback, interval) => {
    let stop = false
    const clear = () => (stop = true)

    const repeat = _ => {
      callback().then(_ => {
        if (stop) return
        setTimeout(repeat, interval)
      })
    }

    repeat()

    return clear
  }

  //------------------------------------------------------------------//
  // Events

  window.addEventListener('web3sdk-connected', async _ => {
    Web3SDK.state.cap = await token.read().cap()
    const { account, cap } = Web3SDK.state
    const tokenCap = Web3SDK.toEther(cap)
    const balance = {
      eth: await Web3SDK.web3().eth.getBalance(account),
      token: await token.read().balanceOf(account)
    }

    balanceETH.innerHTML = `Balance: ${weiToFixed(balance.eth)}`
    balanceToken.innerHTML = `Balance: ${weiToFixed(balance.token)}`

    interval = asyncSetInterval(async _ => {
      tokenBalance = Web3SDK.toEther(await swap.read().balanceEther(), 'number')
      buyingTokenFor = await swap.read().buyingFor(Web3SDK.toWei(1))
      const buyingTokenForEth = Web3SDK.toEther(buyingTokenFor, 'number')

      if (!buyingTokenForEth) {
        output.value = 0
        output.setAttribute('value', 0)  
        return
      }

      const maxInputValue = Math.min(
        tokenCap, 
        tokenBalance / buyingTokenForEth,
        Web3SDK.toEther(balance.token, 'number').toFixed(4)
      )
      input.setAttribute('max', maxInputValue)
      if (input.value > maxInputValue) {
        input.value = maxInputValue
      }
      
      const outputValue = (input.value * buyingTokenForEth).toFixed(4)

      output.value = outputValue
      output.setAttribute('value', outputValue)
    }, 2000)
  })

  window.addEventListener('web3sdk-disconnected',  async _ => {
    //clear interval
    interval()
  })

  window.addEventListener('sell-click', async _ => {
    const account = Web3SDK.state.account
    const tokenAmount = Web3SDK.toWei(input.value)
    
    //gas check
    try {
      await token.gas(account, 0).approve(swap.address, tokenAmount)
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
      await token.write(account, 0, 2).approve(swap.address, tokenAmount)
    } catch(e) {
      return notify('error', e.message)
    }
    
    //gas check
    try {
      await swap.gas(account, 0).sell(account, tokenAmount)
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
      await swap.write(account, 0, 2).sell(account, tokenAmount)
      window.location.reload()
    } catch(e) {
      return notify('error', e.message)
    }
  })

  window.addEventListener('watch-click', async (e) => {
    await network.contract(e.for.getAttribute('data-crypto')).addToWallet()
  })

  //------------------------------------------------------------------//
  // Initialize
})