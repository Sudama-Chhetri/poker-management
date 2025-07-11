import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '../../../../lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get('playerId');
  const client = await getConnection();
  try {
    let query = 'SELECT id, "playerId", "buyIn", "cashOut", "gameType", "sessionDate" FROM sessions';
    let params: (string | number)[] = [];

    if (playerId) {
      query += ' WHERE "playerId" = $1';
      params.push(parseInt(playerId));
    }

    const res = await client.query(query, params);
    return NextResponse.json(res.rows);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ message: 'Error fetching sessions' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  const { playerId, buyIn, cashOut, gameType, sessionDate } = await req.json();
  const client = await getConnection();
  try {
    const res = await client.query(
      'INSERT INTO sessions ("playerId", "buyIn", "cashOut", "gameType", "sessionDate") VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [playerId, buyIn, cashOut, gameType, sessionDate] // sessionDate is already YYYY-MM-DD string
    );
    const newSessionId = res.rows[0].id;
    return NextResponse.json({ id: newSessionId, playerId, buyIn, cashOut, gameType, sessionDate }, { status: 201 });
  } catch (error) {
    console.error('Error adding session:', error);
    return NextResponse.json({ message: 'Error adding session' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ message: 'Session ID is required' }, { status: 400 });
  }

  const client = await getConnection();
  try {
    const res = await client.query('DELETE FROM sessions WHERE id = $1 RETURNING id', [id]);

    if (res.rowCount === 0) {
      return NextResponse.json({ message: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Session deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ message: 'Error deleting session' }, { status: 500 });
  } finally {
    client.release();
  }
}
