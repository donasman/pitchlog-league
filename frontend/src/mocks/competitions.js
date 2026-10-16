/**
 * Mock 대회 데이터
 * 백엔드 연결 전 화면 검증용. 실제 서비스 데이터가 아닙니다.
 * 연결 지점: src/services/competitionService.js → GET /api/competitions
 *
 * @typedef {'league'|'cup'|'groups_knockout'} CompetitionFormat
 * @typedef {{ id:string, slug:string, name:string, shortName:string, country:string,
 *   format:CompetitionFormat, currentSeason:string, initials:string,
 *   currentStageLabel:string }} Competition
 * @typedef {{ id:string, label:string, year:number, current:boolean, dataState:'NONE'|'PARTIAL'|'COMPLETE' }} Season
 */

/** @type {Competition[]} */
export const COMPETITIONS = [
  { id:'epl',        slug:'premier-league',  name:'Premier League',        shortName:'EPL',    country:'England', format:'league',          currentSeason:'2026-27', initials:'PL',  currentStageLabel:'Matchweek 13'  },
  { id:'laliga',     slug:'la-liga',         name:'La Liga',               shortName:'LaLiga', country:'Spain',   format:'league',          currentSeason:'2026-27', initials:'LL',  currentStageLabel:'Jornada 13'    },
  { id:'bundesliga', slug:'bundesliga',      name:'Bundesliga',            shortName:'BL',     country:'Germany', format:'league',          currentSeason:'2026-27', initials:'BL',  currentStageLabel:'Spieltag 12'   },
  { id:'seriea',     slug:'serie-a',         name:'Serie A',               shortName:'SA',     country:'Italy',   format:'league',          currentSeason:'2026-27', initials:'SA',  currentStageLabel:'Giornata 13'   },
  { id:'ligue1',     slug:'ligue-1',         name:'Ligue 1',               shortName:'L1',     country:'France',  format:'league',          currentSeason:'2026-27', initials:'L1',  currentStageLabel:'Journée 13'    },
  { id:'ucl',        slug:'champions-league',name:'UEFA Champions League', shortName:'UCL',    country:'Europe',  format:'groups_knockout', currentSeason:'2026-27', initials:'UCL', currentStageLabel:'Matchday 4'    },
]

/**
 * @type {Season[]}
 * 실 API 의 `normalizeSeason`(services/normalize.js) 과 같은 모양이어야 한다 —
 * 선택기가 `dataState === 'COMPLETE'` 로 거르고 URL 에 `year` 를 쓰기 때문에,
 * 이 둘이 없으면 Mock 모드에서 시즌 선택기가 통째로 빈다.
 */
export const SEASONS = [
  { id:'2026-27', label:'2026-27', year:2026, current:true,  dataState:'COMPLETE' },
  { id:'2025-26', label:'2025-26', year:2025, current:false, dataState:'COMPLETE' },
  { id:'2024-25', label:'2024-25', year:2024, current:false, dataState:'COMPLETE' },
]

/**
 * slug로 대회 검색
 * @param {string} slug
 * @returns {Competition|undefined}
 */
export function getCompetitionBySlug(slug) {
  return COMPETITIONS.find(c => c.slug === slug)
}
