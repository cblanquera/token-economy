window.addEventListener('web3sdk-ready', async _ => {
  //------------------------------------------------------------------//
  // Variables

  const network = Web3SDK.network('ethereum')
  const token = network.contract('token')
  const swap = network.contract('swap')

  let sellingTokenFor = 0
  let tokenBalance = 0
  
  const input = document.getElementById('eth')
  const output = document.getElementById('token')

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
    const { account } = Web3SDK.state
    const balance = {
      eth: await Web3SDK.web3().eth.getBalance(account),
      token: await token.read().balanceOf(account)
    }

    balanceETH.innerHTML = `Balance: ${weiToFixed(balance.eth)}`
    balanceToken.innerHTML = `Balance: ${weiToFixed(balance.token)}`

    interval = asyncSetInterval(async _ => {
      tokenBalance = Web3SDK.toEther(await swap.read().balanceToken())
      sellingTokenFor = await swap.read().sellingFor(Web3SDK.toWei(1))
      const sellingTokenForEth = Web3SDK.toEther(sellingTokenFor, 'number')
      if (!sellingTokenForEth) {
        output.value = 0
        output.setAttribute('value', 0)  
        return
      }

      const maxInputValue = Math.min(
        tokenBalance * sellingTokenForEth,
        Web3SDK.toEther(balance.eth, 'number').toFixed(4)
      )

      input.setAttribute('max', maxInputValue)
      if (input.value > maxInputValue) {
        input.value = maxInputValue
      }

      const outputValue = (input.value / sellingTokenForEth).toFixed(4)

      output.value = outputValue
      output.setAttribute('value', outputValue)
    }, 2000)
  })

  window.addEventListener('web3sdk-disconnected',  async _ => {
    //clear interval
    interval()
  })

  window.addEventListener('buy-click', async _ => {
    const account = Web3SDK.state.account
    const ethAmount = Web3SDK.toWei(input.value)
    const tokenAmount = Web3SDK.toWei(output.value)

    //gas check
    try {
      await swap.gas(account, ethAmount).buy(account, tokenAmount)
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
      await swap.write(account, ethAmount, 2).buy(account, tokenAmount)
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