/**
 * RLCC Ministry Overview and Reviewer
 * ---------------------------------------------------------------------------
 * Curriculum.gs — the content of the pathway: REACH · CORE · LEAD.
 *
 * This is the single source of truth for everything the app shows. The server
 * reads it for validation and reporting, and the browser receives a copy at
 * load time. Edit the text here and both sides stay in sync.
 *
 * Shape:
 *   areas[]                -> a ministry area (REACH, CORE, LEAD)
 *     steps[]              -> a step inside the area
 *       substeps[]         -> the lettered items that must all be applied
 *
 * IMPORTANT: `id` values are what progress is stored against in the sheet.
 * Renaming an id will orphan progress for that item, so add rather than
 * rename once people have started using the app.
 * ---------------------------------------------------------------------------
 */

var CURRICULUM = {
  version: '1.0',
  updated: '2026-10-13',

  intro: 'The RLCC pathway has three movements. REACH brings people to Christ and ' +
         'into the church. CORE grows them into faithful, fruitful disciples. LEAD ' +
         'raises up leaders who will start the whole cycle again somewhere new. ' +
         'Work through each step, apply every sub-step, and only then move forward.',

  areas: [
    /* ===================================================================
     * REACH
     * =================================================================== */
    {
      id: 'reach',
      code: 'REACH',
      name: 'Reaching Everyone and Converting Hearts',
      accent: '#c2410c',
      tint: '#fff2eb',
      summary: 'Evangelism and incorporation: from your own circle of influence ' +
               'to a baptized, connected member of RLCC.',
      steps: [
        {
          id: 'reach-1',
          order: 1,
          action: 'GO',
          title: 'GO to your world',
          summary: 'God has already placed you where you need to be in order to reach ' +
                   'the world for Christ. This is your "oikos". You need to GO to your ' +
                   'world to reach your "oikos". To do this, you need to...',
          proof: 'As proof of this, you need to have a live H.I.T. List (Hearts in ' +
                 'Transition List) where you can place the names of people that you ' +
                 'are praying for.',
          reflectionPrompt: 'Name the people on your H.I.T. List and describe how you ' +
                            'are praying for them.',
          substeps: [
            {
              id: 'reach-1-G',
              letter: 'G',
              label: 'Generate connections',
              apply: 'List by name the people God has already placed around you — ' +
                     'family, neighbours, co-workers, classmates, and online friends. ' +
                     'Keep the list current.'
            },
            {
              id: 'reach-1-O',
              letter: 'O',
              label: "Offer God's love to the lost",
              apply: 'Choose one or two names from your list and offer God\'s love in a ' +
                     'concrete way this week: a kind deed, an act of service, a prayer, ' +
                     'or a listening ear.'
            }
          ]
        },
        {
          id: 'reach-2',
          order: 2,
          action: 'BRING',
          title: 'BRING Seekers to Christ',
          summary: 'Among those who you meet, there will be men or women of peace who ' +
                   'are seeking for the truth. God is also seeking them and wanting them ' +
                   'to be reconciled with Himself. If you meet such a person, you must ' +
                   'BRING them to Christ. To do this, you need to...',
          proof: '',
          reflectionPrompt: 'Who are you bringing to Christ, and where are they in the ' +
                            'B-R-I-N-G process?',
          substeps: [
            {
              id: 'reach-2-B',
              letter: 'B',
              label: 'Begin spiritual conversations with them',
              apply: 'Ask about their life and their beliefs, and listen more than you ' +
                     'talk. Look for openness.'
            },
            {
              id: 'reach-2-R',
              letter: 'R',
              label: 'Reveal your personal testimony',
              apply: 'Prepare and share in two to three minutes what your life was like ' +
                     'before Christ, how you met Him, and what He has done since.'
            },
            {
              id: 'reach-2-I',
              letter: 'I',
              label: 'Invite them to attend church with you, a Community event, or a ' +
                     'Circle (small group) that you belong to',
              apply: 'Give a specific, personal invitation with a date and a time.'
            },
            {
              id: 'reach-2-N',
              letter: 'N',
              label: 'Narrate the Gospel if they are willing to listen',
              apply: 'Walk them through the gospel clearly, using our RLBS (Real Life ' +
                     'Bible Study) if they are willing.'
            },
            {
              id: 'reach-2-G',
              letter: 'G',
              label: 'Guide them toward genuine conversion',
              apply: 'Faith in Jesus displayed via water baptism. Help them respond in ' +
                     'faith and follow through in baptism.'
            }
          ]
        },
        {
          id: 'reach-3',
          order: 3,
          action: 'JOIN',
          title: 'JOIN new and old (unchurched) believers to RLCC',
          summary: 'When a person comes to faith in Christ, and is water baptized ' +
                   '(whether new or old), and if they do not belong to a local church ' +
                   'yet (unchurched), you need to JOIN them to RLCC. To do this, you ' +
                   'need to...',
          proof: '',
          reflectionPrompt: 'Who have you joined to RLCC, and what are their next steps?',
          substeps: [
            {
              id: 'reach-3-J',
              letter: 'J',
              label: 'Judge if they need help with their conversion',
              apply: 'Ask honest questions to see whether their faith in Christ is clear ' +
                     'and settled, and help them where it is not.'
            },
            {
              id: 'reach-3-O',
              letter: 'O',
              label: 'Orient them about RLCC',
              apply: 'Walk them through who we are: our vision, our values, our Sunday ' +
                     'Worship Celebration, and our Communities and Circles.'
            },
            {
              id: 'reach-3-I',
              letter: 'I',
              label: 'Invite them to attend our Sunday Worship Celebration',
              apply: 'Give them the date, time, and place — and offer to go with them or ' +
                     'meet them there.'
            },
            {
              id: 'reach-3-N',
              letter: 'N',
              label: 'Nudge them to join a Community or a Circle (small group)',
              apply: 'Introduce them to a specific Community or Circle leader and help ' +
                     'them take the first step of attending.'
            }
          ]
        }
      ]
    },

    /* ===================================================================
     * CORE
     * =================================================================== */
    {
      id: 'core',
      code: 'CORE',
      name: 'Creating Ongoing Renewal Environments',
      accent: '#365233',
      tint: '#eef3eb',
      summary: 'Discipleship: caring for members, building them up in the faith, and ' +
               'deploying them as workers in the ministry.',
      steps: [
        {
          id: 'core-1',
          order: 1,
          action: 'CARE',
          title: 'CARE for Members',
          summary: 'When people join a Community and/or a Circle, it is important that ' +
                   'they experience personal CARE. To do this, you need to...',
          proof: '',
          reflectionPrompt: 'Who are you caring for, and how do you check in on them?',
          substeps: [
            {
              id: 'core-1-C',
              letter: 'C',
              label: 'Check-in on them regularly',
              apply: 'Whether in person or online. Set a rhythm — a weekly message or ' +
                     'call — and keep a simple record so no one is forgotten.'
            },
            {
              id: 'core-1-A',
              letter: 'A',
              label: 'Ask them how they are feeling or experiencing God',
              apply: 'Ask open questions about their walk with God this week, not only ' +
                     'about their circumstances.'
            },
            {
              id: 'core-1-R',
              letter: 'R',
              label: 'Respond to them with empathy',
              apply: 'Reflect back what you hear and let them know they are not alone ' +
                     'before you offer any advice.'
            },
            {
              id: 'core-1-E',
              letter: 'E',
              label: 'Encourage them to respond faithfully to the Lord',
              apply: 'Regardless of what is happening in their lives, point them to ' +
                     'God\'s Word and His character.'
            }
          ]
        },
        {
          id: 'core-2',
          order: 2,
          action: 'BUILD',
          title: 'BUILD Disciples in the Faith',
          summary: 'It is not enough to CARE for members. You must also BUILD them up in ' +
                   'the faith so that they will become faithful and fruitful disciples of ' +
                   'Jesus Christ together with others. To do this, you need to...',
          proof: '',
          reflectionPrompt: 'Who is in your Timothy Accountability Group, and what are ' +
                            'you building into them?',
          substeps: [
            {
              id: 'core-2-B',
              letter: 'B',
              label: 'Begin a Timothy Accountability Group',
              apply: 'Gather two to four people of the same gender into an intentional ' +
                     'group with a set time and a simple plan.'
            },
            {
              id: 'core-2-U',
              letter: 'U',
              label: 'Understand their learning needs',
              apply: 'Find out what questions they are asking and where they are ' +
                     'struggling to grow.'
            },
            {
              id: 'core-2-I',
              letter: 'I',
              label: 'Instruct them according to their learning style',
              apply: 'Vary how you teach — discussion, storytelling, reading, doing — so ' +
                     'that each person can receive it.'
            },
            {
              id: 'core-2-L',
              letter: 'L',
              label: 'Love them unconditionally but firmly',
              apply: 'Keep grace and truth together: accept the person while holding to ' +
                     'God\'s standards.'
            },
            {
              id: 'core-2-D',
              letter: 'D',
              label: 'Develop their godly habits',
              apply: 'Help them build habits of prayer, Bible reading, giving, serving, ' +
                     'and sharing their faith — and check in on those habits.'
            }
          ]
        },
        {
          id: 'core-3',
          order: 3,
          action: 'DEPLOY',
          title: 'DEPLOY Workers for Ministry',
          summary: 'As disciples grow in their knowledge of God, you need to DEPLOY them ' +
                   'as workers in the ministry. This is the goal of equipping. To do ' +
                   'this, you need to...',
          proof: '',
          reflectionPrompt: 'Who are you deploying, and how are you equipping and ' +
                            'overseeing them?',
          substeps: [
            {
              id: 'core-3-D',
              letter: 'D',
              label: 'Discern their ministry calling',
              apply: 'Look at the gifts, passions, and fruit you see in them, and pray ' +
                     'with them about where God is leading.'
            },
            {
              id: 'core-3-E',
              letter: 'E',
              label: 'Equip them for the ministry God is calling them to do',
              apply: 'Provide the training, mentoring, and resources that specific ' +
                     'ministry requires.'
            },
            {
              id: 'core-3-P',
              letter: 'P',
              label: 'Process them for onboarding in ministry',
              apply: 'Walk them through your ministry\'s orientation, requirements, and ' +
                     'expectations.'
            },
            {
              id: 'core-3-L',
              letter: 'L',
              label: 'Launch them with prayer into the ministry',
              apply: 'Commission them publicly and pray over them as they begin.'
            },
            {
              id: 'core-3-O',
              letter: 'O',
              label: 'Oversee their initial progress',
              apply: 'Stay close during the first weeks and months; give feedback and ' +
                     'encouragement.'
            },
            {
              id: 'core-3-Y',
              letter: 'Y',
              label: 'Yield the responsibility to oversee them to the ministry leader ' +
                     'in charge',
              apply: 'Hand over oversight at the right time so that they are cared for ' +
                     'by the leader who will shepherd them long-term.'
            }
          ]
        }
      ]
    },

    /* ===================================================================
     * LEAD
     * =================================================================== */
    {
      id: 'lead',
      code: 'LEAD',
      name: 'Leadership Empowerment and Development',
      accent: '#1e3a8a',
      tint: '#eef2ff',
      summary: 'Leadership pipeline: spotting, training, assigning, and finally ' +
               'sending leaders out to start new ministries.',
      steps: [
        {
          id: 'lead-1',
          order: 1,
          action: 'SPOT',
          title: 'SPOT Potential Leaders',
          summary: 'The first step in developing leaders is to identify potential ' +
                   'leaders. Potential leaders are those who are faithful and fruitful ' +
                   'in their ministry. To do this, you need to...',
          proof: '',
          reflectionPrompt: 'Who are the potential leaders you are spotting, and what ' +
                            'have you observed in them?',
          substeps: [
            {
              id: 'lead-1-S',
              letter: 'S',
              label: 'See their potential',
              apply: 'Identify those who are faithful and fruitful in ministry — not ' +
                     'merely those who are available or talented.'
            },
            {
              id: 'lead-1-P',
              letter: 'P',
              label: 'Pray for their growth and development',
              apply: 'Pray for them by name, regularly, as the leaders God may raise up ' +
                     'through you.'
            },
            {
              id: 'lead-1-O',
              letter: 'O',
              label: 'Observe their current life and ministry',
              apply: 'Watch their character, competence, commitment, chemistry, and ' +
                     'capacity over time.'
            },
            {
              id: 'lead-1-T',
              letter: 'T',
              label: 'Talk to them about becoming leaders',
              apply: 'Have a direct conversation about leadership development and listen ' +
                     'carefully to their response.'
            }
          ]
        },
        {
          id: 'lead-2',
          order: 2,
          action: 'TRAIN',
          title: 'TRAIN Emerging Leaders',
          summary: 'Once a person agrees to pursue leadership development, you need to ' +
                   'TRAIN them. To do this, you need to...',
          proof: '',
          reflectionPrompt: 'Who are you training, and what tasks and responsibilities ' +
                            'have you assigned them?',
          substeps: [
            {
              id: 'lead-2-T',
              letter: 'T',
              label: 'Teach them about spiritual leadership',
              apply: 'Use the Word, your own example, and our leadership materials to ' +
                     'shape their understanding.'
            },
            {
              id: 'lead-2-R',
              letter: 'R',
              label: 'Rely on God\'s processing methods',
              apply: 'E.g. trials, testings, temptations, etc. Help them read those as ' +
                     'God\'s shaping work, not as failure.'
            },
            {
              id: 'lead-2-A',
              letter: 'A',
              label: 'Assign appropriate leadership tasks (not titles)',
              apply: 'Give real tasks with real responsibility before any title is ' +
                     'discussed.'
            },
            {
              id: 'lead-2-I',
              letter: 'I',
              label: 'Increase their responsibility over time',
              apply: 'Expand their scope step by step as they prove faithful.'
            },
            {
              id: 'lead-2-N',
              letter: 'N',
              label: 'Nurture their development as leaders',
              apply: 'Keep mentoring, coaching, and encouraging through the whole ' +
                     'process.'
            }
          ]
        },
        {
          id: 'lead-3',
          order: 3,
          action: 'ASSIGN',
          title: 'ASSIGN Empowered Leaders',
          summary: 'When a leader is ready, you need to ASSIGN them to a leadership ' +
                   'role. To do this, you need to...',
          proof: '',
          reflectionPrompt: 'Whom are you assigning into leadership, and what are their ' +
                            'clear expectations?',
          substeps: [
            {
              id: 'lead-3-A',
              letter: 'A',
              label: 'Assess their readiness and calling',
              apply: 'Review character, competence, commitment, chemistry, and capacity ' +
                     'before you assign.'
            },
            {
              id: 'lead-3-S1',
              letter: 'S',
              label: 'Set clear expectations (role, responsibility, reporting)',
              apply: 'Write down what they are responsible for and to whom they report.'
            },
            {
              id: 'lead-3-S2',
              letter: 'S',
              label: 'Select the right ministry assignment',
              apply: 'Match the person to the place where their gifts and the church\'s ' +
                     'needs meet.'
            },
            {
              id: 'lead-3-I',
              letter: 'I',
              label: 'Install them with authority and affirmation',
              apply: 'Publicly affirm them and give them the authority they need to lead.'
            },
            {
              id: 'lead-3-G',
              letter: 'G',
              label: 'Guide them through continuous coaching and support',
              apply: 'Set a regular coaching rhythm and keep it.'
            },
            {
              id: 'lead-3-N',
              letter: 'N',
              label: 'Nurture their growth and development',
              apply: 'Keep investing in their growth after the installation.'
            }
          ]
        },
        {
          id: 'lead-4',
          order: 4,
          action: 'SEND',
          title: 'SEND Established Leaders',
          summary: 'When the credibility of a leader has been established (Character, ' +
                   'Competence, Commitment, Chemistry, and Capacity), it is time to SEND ' +
                   'them out to start a new ministry somewhere. To do this, you need to...',
          proof: '',
          reflectionPrompt: 'Who are you sending out, and how are their A-Team and ' +
                            'their new REACH · CORE · LEAD systems doing?',
          substeps: [
            {
              id: 'lead-4-S',
              letter: 'S',
              label: 'Start forming an Apostolic Team (A-Team)',
              apply: 'Gather the team who will pioneer the new ministry with the leader.'
            },
            {
              id: 'lead-4-E',
              letter: 'E',
              label: 'Empower the A-Team to do ministry together',
              apply: 'Give them authority and shared ownership; let them lead, not only ' +
                     'assist.'
            },
            {
              id: 'lead-4-N',
              letter: 'N',
              label: 'Navigate the challenges through regular companionship and ' +
                     'coaching with them',
              apply: 'Stay with them through the difficulties with consistent presence ' +
                     'and coaching.'
            },
            {
              id: 'lead-4-D',
              letter: 'D',
              label: 'Develop the three essential systems in their new target area ' +
                     '(REACH, CORE, LEAD)',
              apply: 'Help them build REACH, CORE, and LEAD in their new field so that ' +
                     'the ministry sustains itself.'
            }
          ]
        }
      ]
    }
  ]
};
