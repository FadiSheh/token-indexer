import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  Image,
  Input,
  SimpleGrid,
  Text,
  InputGroup,
  InputRightAddon,
  Spinner
} from '@chakra-ui/react'
import { CheckIcon, CloseIcon } from '@chakra-ui/icons'
import { Alchemy, Network, Utils } from 'alchemy-sdk'
import { useState } from 'react'
import { isAddress } from 'web3-validator'
import { ethers } from 'ethers'

const provider = new ethers.providers.Web3Provider(window.ethereum)

function App () {
  const [userAddress, setUserAddress] = useState('')
  const [results, setResults] = useState({ tokenBalances: [] })
  const [hasQueried, setHasQueried] = useState(false)
  const [tokenDataObjects, setTokenDataObjects] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [accounts, setAccounts] = useState([])

  async function getAccounts () {
    setResults({ tokenBalances: [] })

    try {
      const accounts = await provider.send('eth_requestAccounts', [])
      const firstAccount = accounts[0]
      setAccounts(firstAccount)
      setUserAddress(firstAccount)

      if (firstAccount) {
        getTokenBalance(firstAccount)
      }
    } catch (e) {
      console.error('Error retrieving accounts:', e)
    }
  }

  const config = {
    apiKey: '',
    network: Network.ETH_MAINNET
  }

  const alchemy = new Alchemy(config)

  const handleInputChange = async e => {
    console.log('handling input change')
    setIsChecking(true)
    const newValue = e.target.value

    try {
      let resolvedAddress
      if (newValue.endsWith('.eth')) {
        resolvedAddress = await alchemy.core.resolveName(newValue)
        if (!resolvedAddress) {
          throw new Error('Invalid ENS name')
        }
      } else {
        resolvedAddress = newValue
      }
      const validity = isAddress(resolvedAddress)
      setIsValid(validity)
      if (validity) {
        setUserAddress(resolvedAddress)
        setIsChecking(false)
      } else {
        setUserAddress('')
        throw new Error('Wrong Format')
      }
    } catch (e) {
      setIsValid(false)
      setIsChecking(false)
      console.error('Error in input change:', e)
    }
  }

  async function getTokenBalance (address) {
    setIsLoading(true)
    console.log('For Address: ', address)

    try {
      const valid = isAddress(address)
      if (valid) {
        const data = await alchemy.core.getTokenBalances(address)
        console.log('Retrieved tokens:', data)
        setResults(data)

        const tokenDataPromises = data.tokenBalances.map(token =>
          alchemy.core.getTokenMetadata(token.contractAddress)
        )

        setTokenDataObjects(await Promise.all(tokenDataPromises))
        setHasQueried(true)
      } else {
        throw new Error('Address is invalid')
      }
    } catch (error) {
      console.error('Error in getting token balances:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box w='100vw' textAlign={'center'}>
      <Center>
        <Flex
          alignItems={'center'}
          justifyContent='center'
          flexDirection={'column'}
          width={'90%'}
        >
          <Heading mb={0} fontSize={36}>
            ERC-20 Token Indexer
          </Heading>

          <Text>
            Plug in an address and this website will return all of its ERC-20
            token balances!
          </Text>

          <Button fontSize={20} onClick={getAccounts} mt={20}>
            Check token balances in your Wallet!
          </Button>

          <Heading mt={48}>
            Get all the ERC-20 token balances of this address:
          </Heading>

          <Flex alignItems={'center'} justifyContent='center' width={'90%'}>
            <InputGroup height={'40px'} width={'600px'}>
              <Input
                id='input-address'
                marginLeft={'10px'}
                onChange={handleInputChange}
                textAlign='center'
                fontSize={20}
                placeholder='Enter ETH Address'
                width={'90%'}
                isDisabled={isLoading}
              />
              <Box>
                <InputRightAddon>
                  {isChecking ? (
                    <Spinner
                      h='13px'
                      w='13px'
                      color='#646cff'
                      margin={'12px'}
                    />
                  ) : isValid ? (
                    <CheckIcon color='green' margin={'12px'} />
                  ) : (
                    <CloseIcon color='red' margin={'12px'} />
                  )}
                </InputRightAddon>
              </Box>
            </InputGroup>
          </Flex>

          <Button
            fontSize={20}
            onClick={() =>
              getTokenBalance(document.getElementById('input-address').value)
            }
            mt={36}
            isLoading={isLoading}
            loadingText='Retrieving Tokens'
            isDisabled={!userAddress}
            _disabled={{
              cursor: 'not-allowed'
            }}
          >
            Check ERC-20 Token Balances
          </Button>

          <Heading hidden={isLoading || !hasQueried} my={36}>
            ERC-20 token balances:
          </Heading>
          {hasQueried ? (
            results.tokenBalances.length > 1 ? (
              <SimpleGrid
                columns={Math.min(4, results.tokenBalances.length)}
                spacing={'5vw'}
              >
                {results.tokenBalances.map((e, i) => (
                  <Flex
                    flexDir={'column'}
                    color='white'
                    bg='transparent'
                    w={'10vw'}
                    key={e.contractAddress}
                    alignItems='center'
                    justifyContent={'center'}
                  >
                    <Image boxSize='80px' src={tokenDataObjects[i]?.logo} />
                    <Box>${tokenDataObjects[i]?.symbol}&nbsp;</Box>
                    <Box>
                      {parseFloat(
                        Utils.formatUnits(
                          e.tokenBalance,
                          tokenDataObjects[i]?.decimals
                        )
                      ).toFixed(1)}
                    </Box>
                  </Flex>
                ))}
              </SimpleGrid>
            ) : (
              <Text>No tokens found for this address.</Text>
            )
          ) : (
            <Text>Please make a query! This may take a few seconds...</Text>
          )}
        </Flex>
      </Center>
    </Box>
  )
}

export default App
