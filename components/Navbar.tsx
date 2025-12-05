import { Link } from 'next-view-transitions'
import React from 'react'

const Navbar = () => {
  return (
    <div className='flex items-center justify-between'>

      <Link href="/">
      <img src="/logo.png" alt="" className='w-[200px]' />
      </Link>



      <div className='flex items-center text- space-x-3'>
        <span className=''>Login</span>
        <span>/</span>
        <span className=''>SignUp</span>
      </div>


    </div>
  )
}

export default Navbar