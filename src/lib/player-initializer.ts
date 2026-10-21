export function createPlayerInitializer<T>(load:()=>Promise<T>){
  let inFlight:Promise<T>|null=null;
  return ()=>{
    if(!inFlight)inFlight=load().finally(()=>{inFlight=null;});
    return inFlight;
  };
}
