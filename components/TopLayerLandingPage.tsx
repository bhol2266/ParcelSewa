"use client"
import React from 'react'
import { motion } from "motion/react"


const TopLayerLandingPage = () => {
    return (

        <motion.div
            className="w-full max-w-4xl font-semibold leading-tight mt-6"
            initial="hidden"
            animate="visible"
            variants={{
                hidden: { opacity: 0, y: 30 },
                visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                        duration: 0.8,
                        ease: "easeOut",
                        staggerChildren: 0.15,
                    },
                },
            }}
        >
            {/* Line 1 */}
            <motion.p
                className="text-3xl lg:text-5xl text-[#002f5c]"
                variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 },
                }}
            >
                India’s favourite brand,
            </motion.p>

            {/* Line 2 */}
            <motion.p
                className="text-3xl sm:text-5xl mt-2 flex flex-wrap"
                variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 },
                }}
            >
                <motion.span
                    className="text-[#f48b28] mr-2"
                    variants={{
                        hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
                        visible: { opacity: 1, y: 0, filter: "blur(0px)" },
                    }}
                >
                    Delivered to
                </motion.span>

                {/* Nepal (mobile) */}
                <motion.span
                    className="text-[#f48b28] lg:hidden block mr-2"
                    variants={{
                        hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
                        visible: { opacity: 1, y: 0, filter: "blur(0px)" },
                    }}
                >
                    Nepal
                </motion.span>

                {/* Nepal (desktop inline) */}
                <motion.span
                    className="hidden lg:inline text-[#f48b28] mr-2"
                    variants={{
                        hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
                        visible: { opacity: 1, y: 0, filter: "blur(0px)" },
                    }}
                >
                    Nepal
                </motion.span>

                <motion.span
                    className="text-[#002f5c]"
                    variants={{
                        hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
                        visible: { opacity: 1, y: 0, filter: "blur(0px)" },
                    }}
                >
                    without hassle.
                </motion.span>
            </motion.p>
        </motion.div>


    )
}

export default TopLayerLandingPage