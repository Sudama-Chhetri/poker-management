import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '../../../../lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get('playerId');
  let connection;
  try {
    connection = await getConnection();
    let query = 'SELECT id, playerId, buyIn, cashOut, gameType, sessionDate FROM sessions';
    let params: (string | number)[] = [];

    if (playerId) {
      query += ' WHERE playerId = ?';
      params.push(parseInt(playerId));
    }

    const [rows] = await connection.execute(query, params);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ message: 'Error fetching sessions' }, { status: 500 });
  } finally {
    if (connection) connection.end();
  }
}

export async function POST(req: NextRequest) {
  const { playerId, buyIn, cashOut, gameType, sessionDate } = await req.json();
  let connection;
  try {
    connection = await getConnection();
    const [result] = await connection.execute(
      'INSERT INTO sessions (playerId, buyIn, cashOut, gameType, sessionDate) VALUES (?, ?, ?, ?, ?)',
      [playerId, buyIn, cashOut, gameType, sessionDate.split('T')[0]] // Ensure date is stored as YYYY-MM-DD string
    );
    const newSessionId = (result as any).insertId;
    return NextResponse.json({ id: newSessionId, playerId, buyIn, cashOut, gameType, sessionDate }, { status: 201 });
  } catch (error) {
    console.error('Error adding session:', error);
    return NextResponse.json({ message: 'Error adding session' }, { status: 500 });
  } finally {
    if (connection) connection.end();
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ message: 'Session ID is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await getConnection();
    const [result] = await connection.execute('DELETE FROM sessions WHERE id = ?', [id]);

    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ message: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Session deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ message: 'Error deleting session' }, { status: 500 });
  } finally {
    if (connection) connection.end();
  }
}
