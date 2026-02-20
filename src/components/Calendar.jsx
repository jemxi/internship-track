import { useState, useEffect, useRef } from 'react'
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, startOfWeek, endOfWeek, isToday, isWithinInterval } from 'date-fns'
import { getCumulativeHoursAt } from '../utils/helpers'

const parseLocalDate = (s) => { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d) }
const toStr = (d) => format(d,'yyyy-MM-dd')

const CELL = {
  projected: { bg:'#f0edff', border:'#c4b5fd', text:'#5b21b6', sub:'#7c6af7' },
  logged:    { bg:'#eff6ff', border:'#93c5fd', text:'#1d4ed8', sub:'#3b82f6' },
  absence:   { bg:'#fff1f2', border:'#fca5a5', text:'#be123c', sub:'#ef4444' },
  holiday:   { bg:'#fefce8', border:'#fde047', text:'#854d0e', sub:'#d97706' },
}

export default function Calendar({
  currentDate, entries, selectedDate, onDateSelect, onMonthChange,
  startDate, projectedEndDate, holidays=[], hoursPerDay=8, workdays=[1,2,3,4,5], targetHours=486,
}) {
  const [pop, setPop] = useState(null)
  const calRef = useRef(null)
  const popRef = useRef(null)

  const monthStart = startOfMonth(currentDate)
  const days       = eachDayOfInterval({ start:startOfWeek(monthStart,{weekStartsOn:0}), end:endOfWeek(endOfMonth(monthStart),{weekStartsOn:0}) })
  const weeks      = []
  for (let i=0;i<days.length;i+=7) weeks.push(days.slice(i,i+7))

  const startObj = startDate        ? parseLocalDate(startDate)        : null
  const endObj   = projectedEndDate ? parseLocalDate(projectedEndDate) : null

  const getStatus  = (d) => { const e=entries[toStr(d)]; if(!e)return null; if(e.isAbsence)return'absence'; if(e.hours>0)return'logged'; return null }
  const isInRange  = (d) => { if(!startObj||!endObj)return false; if(!workdays.includes(d.getDay()))return false; if(holidays.includes(toStr(d)))return false; return isWithinInterval(d,{start:startObj,end:endObj}) }

  useEffect(()=>{
    const fn=(e)=>{ if(popRef.current&&!popRef.current.contains(e.target)&&calRef.current&&!calRef.current.contains(e.target))setPop(null) }
    document.addEventListener('mousedown',fn); return()=>document.removeEventListener('mousedown',fn)
  },[])

  const handleClick = (day,e) => {
    onDateSelect(day)
    const r=e.currentTarget.getBoundingClientRect(); const c=calRef.current?.getBoundingClientRect()
    setPop({dateStr:toStr(day),top:r.top-(c?.top||0),left:r.left-(c?.left||0),dayW:r.width,dayH:r.height})
  }

  const buildPop = () => {
    if(!pop) return null
    const {dateStr}=pop
    const todayStr=toStr(new Date()), entry=entries[dateStr], isHol=holidays.includes(dateStr)
    const isTodays=dateStr===todayStr, isFuture=dateStr>todayStr, isAbsent=entry?.isAbsence===true
    const cumulative=getCumulativeHoursAt({entries,startDate,targetDateStr:dateStr,hoursPerDay,workdays,holidays})
    const remaining=Math.max(0,Number(targetHours)-cumulative)
    const pct=Number(targetHours)>0?Math.min(Math.round((cumulative/Number(targetHours))*100),100):0
    const dow=parseLocalDate(dateStr).getDay()
    const hoursDay=isAbsent||isHol||!workdays.includes(dow)?0:entry?.hours>0?Number(entry.hours):Number(hoursPerDay)
    return {dayLabel:format(parseLocalDate(dateStr),'EEEE, MMMM d'),entry,isHol,cumulative,isTodays,isFuture,remaining,pct,isAbsent,hoursDay}
  }

  const pc = buildPop()

  return (
    <div ref={calRef} style={{ background:'#fff', borderRadius:16, border:'1px solid #eaecf4', boxShadow:'0 1px 6px rgba(80,80,140,.08)', padding:'22px 22px 18px', position:'relative', fontFamily:"'Inter',-apple-system,sans-serif" }}>
      <style>{`
        .ccell{transition:transform .1s,box-shadow .12s;outline:none}
        .ccell:hover{transform:scale(1.08);z-index:5;box-shadow:0 4px 14px rgba(109,81,247,.2)}
        .cnav:hover{background:#f0edff!important;color:#6d51f7!important;border-color:#c4b5fd!important}
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <div style={{ fontSize:20, fontWeight:800, color:'#1a1a2e', letterSpacing:'-0.02em' }}>{format(currentDate,'MMMM yyyy')}</div>
        <div style={{ display:'flex', gap:6 }}>
          {[
            {label:'‹', onClick:()=>{onMonthChange(new Date(currentDate.getFullYear(),currentDate.getMonth()-1));setPop(null)}, w:32},
            {label:'TODAY', onClick:()=>{onMonthChange(new Date());setPop(null)}, w:null, px:12},
            {label:'›', onClick:()=>{onMonthChange(new Date(currentDate.getFullYear(),currentDate.getMonth()+1));setPop(null)}, w:32},
          ].map((b,i)=>(
            <button key={i} className="cnav" onClick={b.onClick} style={{ height:32, width:b.w||'auto', padding:b.px?`0 ${b.px}px`:0, borderRadius:9, border:'1px solid #e2e4ee', background:'#f7f8fc', cursor:'pointer', color:'#6b7280', fontSize:b.label==='TODAY'?11:15, fontWeight:b.label==='TODAY'?800:400, letterSpacing:b.label==='TODAY'?'0.04em':0, transition:'all .15s', display:'flex', alignItems:'center', justifyContent:'center' }}>{b.label}</button>
          ))}
        </div>
      </div>

      {/* Day labels */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:6 }}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>(
          <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:700, color:'#c4c8d8', letterSpacing:'0.06em', padding:'3px 0' }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        {weeks.map((week,wi)=>(
          <div key={wi} style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
            {week.map((day,di)=>{
              const isCur=day.getMonth()===currentDate.getMonth()
              const status=getStatus(day), inRange=isInRange(day), isHol=holidays.includes(toStr(day))
              const isTod=isToday(day), isSel=isSameDay(day,selectedDate)
              const isPop=pop?.dateStr===toStr(day)&&isCur
              const entry=entries[toStr(day)], hasHrs=entry?.hours>0

              let bg='#f7f8fc', border='1.5px solid #f0f0f8', color='#374151'
              if(!isCur){bg='transparent';border='1.5px solid transparent';color='#d1d5db'}
              else if(status==='absence'){bg=CELL.absence.bg;border=`1.5px solid ${CELL.absence.border}`;color=CELL.absence.text}
              else if(status==='logged'){bg=CELL.logged.bg;border=`1.5px solid ${CELL.logged.border}`;color=CELL.logged.text}
              else if(isHol){bg=CELL.holiday.bg;border=`1.5px solid ${CELL.holiday.border}`;color=CELL.holiday.text}
              else if(inRange){bg=CELL.projected.bg;border=`1.5px solid ${CELL.projected.border}`;color=CELL.projected.text}

              let outline='none'
              if(isTod&&isCur) outline='2.5px solid #6d51f7'
              else if(isSel&&isCur) outline='2.5px solid #c4b5fd'

              return (
                <button key={di} className={isCur?'ccell':''} onClick={e=>isCur&&handleClick(day,e)}
                  style={{ borderRadius:10, border, background:bg, color, cursor:isCur?'pointer':'default', aspectRatio:'1', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', fontSize:13, fontWeight:600, padding:0, outline, opacity:isCur?1:0.3, ...(isPop?{transform:'scale(1.1)',zIndex:10,boxShadow:'0 6px 20px rgba(109,81,247,.28)',outline:`2.5px solid #6d51f7`}:{}) }}>
                  <span style={{lineHeight:1}}>{format(day,'d')}</span>
                  {isCur&&hasHrs&&<span style={{fontSize:9,fontWeight:700,color:CELL.logged.sub,marginTop:2}}>{entry.hours}h</span>}
                  {isCur&&inRange&&!hasHrs&&status!=='absence'&&!isHol&&<span style={{fontSize:9,fontWeight:600,color:CELL.projected.sub,marginTop:2}}>{hoursPerDay}h</span>}
                  {isCur&&status==='absence'&&<span style={{fontSize:9,fontWeight:800,color:CELL.absence.sub,marginTop:2}}>ABS</span>}
                  {isHol&&isCur&&<span style={{position:'absolute',top:2,right:3,fontSize:7}}>⭐</span>}
                  {isTod&&isCur&&<span style={{position:'absolute',bottom:2,left:'50%',transform:'translateX(-50%)',width:3,height:3,borderRadius:'50%',background:'#6d51f7'}}/>}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:14, marginTop:16, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <div style={{ width:13, height:13, borderRadius:4, border:'2.5px solid #6d51f7' }} />
          <span style={{ fontSize:10, color:'#b0b4cc', fontWeight:600 }}>Today</span>
        </div>
        {Object.entries({Scheduled:CELL.projected,Logged:CELL.logged,Holiday:CELL.holiday,Absent:CELL.absence}).map(([label,c])=>(
          <div key={label} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:13, height:13, borderRadius:4, background:c.bg, border:`1.5px solid ${c.border}` }} />
            <span style={{ fontSize:10, color:'#b0b4cc', fontWeight:600 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Popover */}
      {pop && pc && (()=>{
        const calW=calRef.current?.offsetWidth||500, popW=284
        const cL=Math.min(Math.max(pop.left-(popW/2)+(pop.dayW/2),8),calW-popW-8)
        const arrL=Math.min(Math.max(pop.left+pop.dayW/2-cL-6,10),popW-20)
        const accent=pc.isFuture?'#4f46e5':pc.isAbsent?'#e11d48':'#6d51f7'
        const barBg=pc.isFuture?'linear-gradient(90deg,#6366f1,#818cf8)':pc.cumulative>=Number(targetHours)?'linear-gradient(90deg,#34d399,#22d3ee)':'linear-gradient(90deg,#6d51f7,#a78bfa)'
        const hBg=pc.isAbsent?'#fff1f2':pc.isHol?'#fefce8':pc.isFuture?'#eef2ff':'#f0edff'
        const hBd=pc.isAbsent?'#fecdd3':pc.isHol?'#fde68a':pc.isFuture?'#c7d2fe':'#ddd6fe'

        return (
          <div ref={popRef} style={{ position:'absolute', zIndex:50, top:pop.top+pop.dayH+10, left:cL, width:popW }}>
            <div style={{ position:'absolute', top:-6, left:arrL, width:12, height:12, transform:'rotate(45deg)', background:hBg, borderLeft:`1px solid ${hBd}`, borderTop:`1px solid ${hBd}` }} />
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e5e7eb', boxShadow:'0 10px 36px rgba(30,31,46,.16)', overflow:'hidden' }}>
              <div style={{ background:hBg, borderBottom:`1px solid ${hBd}`, padding:'11px 15px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:13, color:'#111827' }}>{pc.dayLabel}</div>
                  <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>{pc.isHol?'⭐ Philippine Holiday':pc.isAbsent?'🚫 Marked Absent':pc.isFuture?'📅 Projected':'✅ Hours counted'}</div>
                </div>
                <button onClick={()=>setPop(null)} style={{ width:22, height:22, borderRadius:'50%', background:'rgba(0,0,0,.06)', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginLeft:8 }}>✕</button>
              </div>
              <div style={{ padding:'13px 15px', display:'flex', flexDirection:'column', gap:10 }}>
                {!pc.isHol&&!pc.isAbsent&&pc.hoursDay>0&&(
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:12, color:'#6b7280' }}>{pc.isFuture?'Projected this day':'Hours this day'}</span>
                    <span style={{ fontSize:14, fontWeight:800, color:accent, background:hBg, padding:'2px 10px', borderRadius:7 }}>
                      {pc.hoursDay}h {pc.entry?.hours>0&&!pc.isFuture&&<span style={{fontSize:10,color:'#9ca3af',fontWeight:400}}>manual</span>}
                    </span>
                  </div>
                )}
                {pc.cumulative>0&&(<>
                  <div style={{height:1,background:'#f0f0f6'}}/>
                  <p style={{fontSize:12,color:'#374151',lineHeight:1.65,margin:0}}>
                    {pc.isFuture?(<>When you reach this date, you'll have <strong style={{color:'#4f46e5'}}>{pc.cumulative}/{targetHours} hrs</strong>.{' '}{pc.remaining>0?<span style={{color:'#9ca3af'}}>({pc.remaining} hrs to go)</span>:<strong style={{color:'#059669'}}>Goal achieved! 🎉</strong>}</>)
                    :pc.isTodays?(<>From the start you've reached <strong style={{color:'#6d51f7'}}>{pc.cumulative}/{targetHours} hrs</strong>.{' '}{pc.remaining>0?<><strong style={{color:'#ea580c'}}>{pc.remaining} hrs</strong> to go! 💪</>:<strong style={{color:'#059669'}}>Goal achieved! 🎉</strong>}</>)
                    :(<>By this date you had <strong style={{color:'#6d51f7'}}>{pc.cumulative} hrs</strong>.{pc.remaining>0&&<span style={{color:'#9ca3af'}}> ({pc.remaining} hrs remaining)</span>}</>)}
                  </p>
                  <div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#9ca3af',marginBottom:5}}><span>{pc.cumulative}h</span><span>{targetHours}h target</span></div>
                    <div style={{height:5,background:'#f0f0f6',borderRadius:99,overflow:'hidden'}}>
                      <div style={{height:'100%',borderRadius:99,width:`${pc.pct}%`,background:barBg,transition:'width .4s ease'}}/>
                    </div>
                    <div style={{textAlign:'right',fontSize:10,fontWeight:800,color:accent,marginTop:4}}>{pc.pct}%</div>
                  </div>
                </>)}
                {pc.isAbsent&&<p style={{fontSize:12,color:'#e11d48',textAlign:'center',margin:0}}>Marked as absent — no hours counted.</p>}
                {pc.isHol&&<p style={{fontSize:12,color:'#d97706',textAlign:'center',margin:0}}>Philippine holiday — not a work day.</p>}
                {pc.cumulative===0&&!pc.isAbsent&&!pc.isHol&&<p style={{fontSize:12,color:'#9ca3af',textAlign:'center',margin:0}}>No hours counted for this range.</p>}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}