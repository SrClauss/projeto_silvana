import { useEffect, useState } from 'react'
import './App.css'
import axios from 'axios'
function App() {
  const [heisemberg, setHeisenberg] = useState('')
  const handleSayMyName = async () => {
    try {
      const response = await axios.get('http://localhost:8000/say_my_name')
      setHeisenberg(response.data.message)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }
  useEffect(() => {
    const fetchData = async () => {
      await handleSayMyName()
    }
    fetchData()
  }, [])

 
  return (
    <>
      <div>{heisemberg}</div>
    </>
  )
}

export default App
