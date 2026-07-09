import { useEffect, useState } from 'react'
import { Megaphone, ImagePlus, Heart, MessageCircle, Trash } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { subscribeAnnouncements, postAnnouncement, toggleLikeAnnouncement, commentAnnouncement, deleteAnnouncement } from '../../lib/companyStore'
import PageHeader from '../../components/PageHeader'
import { Card, DarkButton, EmptyState, Skeleton } from '../../components/ui'
import BottomNav from '../../components/BottomNav'

// Curated, high-quality Unsplash fallback images for posts that don't attach one.
const STOCK_IMAGES = [
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=500&fit=crop',
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=500&fit=crop',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=500&fit=crop',
]

function Linkify({ text }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = (text || '').split(urlRegex)
  return (
    <>
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{part}</a>
        }
        return part
      })}
    </>
  )
}

export default function CompanyFeed() {
  const { companyId, role, user } = useAuth()
  const [feed, setFeed] = useState(null)
  const [composing, setComposing] = useState(false)
  const [form, setForm] = useState({ title: '', body: '' })

  useEffect(() => {
    if (!companyId) return
    return subscribeAnnouncements(companyId, setFeed)
  }, [companyId])

  useEffect(() => {
    if (feed && feed.length === 0) {
      const seeded = localStorage.getItem('pulsehr_seeded_feed_' + companyId)
      if (!seeded) {
        localStorage.setItem('pulsehr_seeded_feed_' + companyId, 'true')
        const seedData = async () => {
          await postAnnouncement(companyId, {
            title: 'Registration Open: AWS re:Invent 2024',
            body: 'Attention Engineering & IT teams! Registration for AWS re:Invent 2024 is now officially open. This is a great opportunity to level up your cloud skills, attend hands-on workshops, and hear about the latest AWS launches.\n\nWe have a limited training budget available. If you are interested in attending virtually or in-person, please check the details and submit your request by next Friday.\n\nRegister and view the agenda here: https://reinvent.awsevents.com/',
            image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=500&fit=crop',
            authorName: 'Engineering Leadership'
          })
          await postAnnouncement(companyId, {
            title: 'Call for Speakers: GitHub Universe',
            body: 'We are incredibly proud of the open-source work our teams have contributed this year! GitHub Universe is approaching, and the Call for Speakers is open.\n\nIf you have a unique case study, a DevSecOps workflow, or an AI integration you built using GitHub Copilot, we strongly encourage you to submit a proposal. The company will sponsor travel for all selected speakers.\n\nSubmit your session proposals here: https://githubuniverse.com/',
            image: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800&h=500&fit=crop',
            authorName: 'Developer Relations'
          })
          await postAnnouncement(companyId, {
            title: 'Microsoft Ignite: AI Transformation',
            body: 'As we continue to integrate Copilot and generative AI into our enterprise workflows, Microsoft Ignite is a must-attend event for our IT administrators and security teams.\n\nLearn how to securely manage AI access, protect enterprise data, and streamline operations. Virtual passes are free for all employees.\n\nSecure your virtual pass: https://ignite.microsoft.com/',
            image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=500&fit=crop',
            authorName: 'IT & Security'
          })
        }
        seedData()
      }
    }
  }, [feed, role, companyId])

  async function submit(e) {
    e.preventDefault()
    await postAnnouncement(companyId, {
      title: form.title, body: form.body, authorName: user.displayName || user.email,
      image: STOCK_IMAGES[Math.floor(Math.random() * STOCK_IMAGES.length)],
    })
    setForm({ title: '', body: '' })
    setComposing(false)
  }

  return (
    <div className="app-shell pb-24">
      <PageHeader title="Company Feed" subtitle="News, events & updates" />
      <div className="px-5 space-y-4">
        {role === 'admin' && (
          <Card>
            {!composing ? (
              <button onClick={() => setComposing(true)} className="flex w-full items-center gap-2 text-sm font-medium text-neutral-500">
                <Megaphone size={16} /> Post an announcement…
              </button>
            ) : (
              <form onSubmit={submit} className="space-y-2">
                <input
                  autoFocus required value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Announcement title"
                  className="w-full rounded-lg border border-base-border bg-white px-3 py-2 text-sm outline-none"
                />
                <textarea
                  required rows={2} value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="What's the update?"
                  className="w-full rounded-lg border border-base-border bg-white px-3 py-2 text-sm outline-none"
                />
                <div className="flex gap-2">
                  <DarkButton type="submit" className="!bg-neutral-900 !text-white">Post</DarkButton>
                  <button type="button" onClick={() => setComposing(false)} className="rounded-xl border border-base-border px-4 text-sm text-neutral-500">Cancel</button>
                </div>
              </form>
            )}
          </Card>
        )}

        {feed === null && Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        {feed?.map((item) => <AnnouncementPost key={item.id} item={item} companyId={companyId} user={user} role={role} />)}
        {feed?.length === 0 && (
          <EmptyState icon={ImagePlus} title="No announcements yet" body={role === 'admin' ? 'Post the first update above.' : 'Check back once HR posts an update.'} />
        )}
      </div>
      <BottomNav />
    </div>
  )
}

function AnnouncementPost({ item, companyId, user, role }) {
  const [commenting, setCommenting] = useState(false)
  const [text, setText] = useState('')
  const likes = item.likes || []
  const comments = item.comments || []
  const liked = likes.includes(user.uid)

  async function toggleLike() {
    await toggleLikeAnnouncement(companyId, item.id, user.uid, liked)
  }

  async function postComment(e) {
    e.preventDefault()
    if (!text.trim()) return
    await commentAnnouncement(companyId, item.id, { employeeId: user.uid, employeeName: user.displayName || user.email, text })
    setText('')
  }

  return (
    <Card className="!p-0 overflow-hidden relative">
      {role === 'admin' && (
        <button 
          onClick={() => { if(confirm('Delete this post?')) deleteAnnouncement(companyId, item.id) }} 
          className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-red-500"
        >
          <Trash size={14} />
        </button>
      )}
      {item.image && <img src={item.image} alt="" className="h-40 w-full object-cover" />}
      <div className="p-4">
        <p className="text-sm font-semibold text-neutral-900 pr-8">{item.title}</p>
        <p className="mt-1 text-xs text-neutral-500 whitespace-pre-wrap"><Linkify text={item.body} /></p>
        <p className="mt-2 text-[11px] text-neutral-400">{item.authorName}</p>
        
        <div className="mt-4 flex items-center gap-4 border-t border-base-border pt-3">
          <button onClick={toggleLike} className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${liked ? 'text-red-500' : 'text-neutral-500 hover:text-neutral-900'}`}>
            <Heart size={16} fill={liked ? 'currentColor' : 'none'} /> {likes.length || ''}
          </button>
          <button onClick={() => setCommenting(!commenting)} className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors">
            <MessageCircle size={16} /> {comments.length || ''}
          </button>
        </div>

        {commenting && (
          <div className="mt-4 space-y-3 bg-neutral-50/50 p-3 rounded-xl">
            {comments.map((c) => (
              <div key={c.id}>
                <p className="text-[11px] font-semibold text-neutral-900">{c.employeeName}</p>
                <p className="text-xs text-neutral-600">{c.text}</p>
              </div>
            ))}
            {comments.length === 0 && <p className="text-[11px] text-neutral-400">No comments yet. Be the first!</p>}
            
            <form onSubmit={postComment} className="flex gap-2 pt-2">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 rounded-full border border-base-border bg-white px-3 py-1.5 text-xs outline-none"
              />
              <button disabled={!text.trim()} type="submit" className="rounded-full bg-neutral-900 px-3 text-xs font-semibold text-white disabled:opacity-50 transition-opacity">Post</button>
            </form>
          </div>
        )}
      </div>
    </Card>
  )
}
