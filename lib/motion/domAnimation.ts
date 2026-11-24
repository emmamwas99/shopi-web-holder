// Its own module so it can be code-split: LazyMotion loads it after the page
// renders (see AppMotion), keeping framer's animation features off the
// critical path of the app's busiest screens.
export { domAnimation as default } from "framer-motion";
